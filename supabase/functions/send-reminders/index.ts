import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret, x-timestamp, x-signature",
};

const jsonResponse = (payload: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const errorResponse = (message: string, status = 500, details?: string) =>
  jsonResponse({ error: { message, details } }, status);

// Track request timestamps for simple in-memory rate limiting
const requestLog: Map<string, number[]> = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 5; // Max 5 requests per minute

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const timestamps = requestLog.get(key) || [];
  const recentTimestamps = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW);
  
  if (recentTimestamps.length >= RATE_LIMIT_MAX) {
    return false;
  }
  
  recentTimestamps.push(now);
  requestLog.set(key, recentTimestamps);
  return true;
}

// Validate HMAC-signed timestamp for cron requests
async function validateCronRequest(
  req: Request, 
  cronSecret: string
): Promise<{ valid: boolean; error?: string }> {
  const providedSecret = req.headers.get("x-cron-secret");
  const timestamp = req.headers.get("x-timestamp");
  const signature = req.headers.get("x-signature");
  
  // Support simple secret validation for backwards compatibility
  if (providedSecret && providedSecret === cronSecret) {
    // Check rate limiting
    const clientIP = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    if (!checkRateLimit(clientIP)) {
      return { valid: false, error: "Rate limit exceeded" };
    }
    return { valid: true };
  }
  
  // Support HMAC-signed timestamp validation for enhanced security
  if (timestamp && signature) {
    const ts = parseInt(timestamp, 10);
    const now = Date.now();
    
    // Reject requests older than 5 minutes
    if (Math.abs(now - ts) > 5 * 60 * 1000) {
      return { valid: false, error: "Request timestamp expired" };
    }
    
    // Verify HMAC signature
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(cronSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const expectedSig = await crypto.subtle.sign("HMAC", key, encoder.encode(timestamp));
    const expectedSigBase64 = btoa(String.fromCharCode(...new Uint8Array(expectedSig)));
    
    if (signature === expectedSigBase64) {
      return { valid: true };
    }
    
    return { valid: false, error: "Invalid signature" };
  }
  
  return { valid: false, error: "Unauthorized - missing authentication" };
}

// Generate cryptographically secure random token and store in database
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateSecureDisableToken(
  supabase: SupabaseClient<any, any, any>,
  userId: string,
  tokenType: string = 'all'
): Promise<string> {
  // Generate 32 cryptographically secure random bytes
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  
  // Convert to URL-safe base64
  const token = btoa(String.fromCharCode(...randomBytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  // Store token in database with 30-day expiration
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  
  const { error } = await supabase.from('unsubscribe_tokens').insert({
    user_id: userId,
    token: token,
    token_type: tokenType,
    expires_at: expiresAt.toISOString(),
  });
  
  if (error) {
    console.error(`Failed to store unsubscribe token for user ${userId}:`, error);
    throw new Error('Failed to generate unsubscribe token');
  }
  
  return token;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("=== SEND-REMINDERS FUNCTION STARTED ===");
  const startTime = Date.now();

  try {
    // SECURITY: Validate authentication
    const cronSecret = Deno.env.get("CRON_SECRET");
    
    if (!cronSecret) {
      console.error("CRITICAL: CRON_SECRET not configured");
      return errorResponse(
        "CRON_SECRET not configured",
        500,
        "Add 'CRON_SECRET' secret in Lovable Cloud settings",
      );
    }
    
    const authResult = await validateCronRequest(req, cronSecret);
    if (!authResult.valid) {
      console.error("Unauthorized:", authResult.error);
      return errorResponse("Unauthorized", 401, authResult.error);
    }
    
    console.log("Authentication validated successfully");
    
    // Validate Resend API key
    const resendApiKey = Deno.env.get("resend");
    if (!resendApiKey) {
      console.error("CRITICAL: RESEND API key not configured");
      return errorResponse(
        "Resend API key not configured",
        500,
        "Add 'resend' secret in Lovable Cloud settings",
      );
    }

    if (resendApiKey.length < 20) {
      console.error("CRITICAL: RESEND API key appears invalid (too short)");
      return errorResponse(
        "Resend API key appears invalid",
        500,
        "Check that the 'resend' secret contains a valid API key",
      );
    }

    const resend = new Resend(resendApiKey);
    console.log("Resend client initialized");

    // Create admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    if (!serviceRoleKey) {
      console.error("CRITICAL: Service role key not configured");
      return errorResponse("Service role key not configured", 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get current time
    const now = new Date();
    console.log(`Running reminder check at ${now.toISOString()}`);

    // Fetch users where email_opt_in=true AND at least one reminder is enabled
    const { data: reminderSettings, error: fetchError } = await supabase
      .from("reminder_settings")
      .select("*")
      .eq("email_opt_in", true)
      .or("bedtime_enabled.eq.true,story_enabled.eq.true");

    if (fetchError) {
      console.error("Failed to fetch reminder settings:", fetchError);
      return errorResponse(
        "Failed to fetch settings",
        500,
        fetchError?.message ?? "Unknown error",
      );
    }

    if (!reminderSettings || reminderSettings.length === 0) {
      console.log("No users with active reminders found");
      return jsonResponse({ sent: 0, checked: 0, duration_ms: Date.now() - startTime });
    }

    console.log(`Found ${reminderSettings.length} users with reminders enabled`);

    let sentCount = 0;
    const errors: string[] = [];
    const processed: string[] = [];

    // Build base URL for disable links
    const functionsUrl = supabaseUrl.replace('.supabase.co', '.supabase.co/functions/v1');

    for (const setting of reminderSettings) {
      try {
        // Validate individual toggles
        if (!setting.bedtime_enabled && !setting.story_enabled) {
          console.log(`User ${setting.user_id}: no reminders enabled, skipping`);
          continue;
        }

        // Get user email
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(setting.user_id);
        
        if (userError || !userData?.user?.email) {
          console.error(`Failed to get user email for ${setting.user_id}:`, userError);
          errors.push(`no_email:${setting.user_id}`);
          continue;
        }

        const userEmail = userData.user.email;
        const userTimezone = setting.timezone || "UTC";

        // Get current time in user's timezone
        let userNow: Date;
        try {
          userNow = new Date(now.toLocaleString("en-US", { timeZone: userTimezone }));
        } catch {
          console.error(`Invalid timezone ${userTimezone} for user ${setting.user_id}, using UTC`);
          userNow = now;
        }

        const userHours = userNow.getHours().toString().padStart(2, "0");
        const userMinutes = Math.floor(userNow.getMinutes() / 10) * 10;
        const userTimeStr = `${userHours}:${userMinutes.toString().padStart(2, "0")}`;

        console.log(`User ${setting.user_id}: local time ${userTimeStr} (${userTimezone})`);

        // Check bedtime reminder
        if (setting.bedtime_enabled && setting.bedtime_time) {
          const [bedHours, bedMinutes] = setting.bedtime_time.split(":").map(Number);
          const roundedBedMinutes = Math.floor(bedMinutes / 10) * 10;
          const bedTimeStr = `${bedHours.toString().padStart(2, "0")}:${roundedBedMinutes.toString().padStart(2, "0")}`;

          if (userTimeStr === bedTimeStr) {
            console.log(`Sending bedtime reminder to ${userEmail}`);
            
            // Generate secure tokens for unsubscribe links
            const disableAllToken = await generateSecureDisableToken(supabase, setting.user_id, 'all');
            const disableBedtimeToken = await generateSecureDisableToken(supabase, setting.user_id, 'bedtime');
            
            const disableAllUrl = `${functionsUrl}/disable-reminders?token=${disableAllToken}`;
            const disableBedtimeUrl = `${functionsUrl}/disable-reminders?token=${disableBedtimeToken}`;
            
            const { error: sendError } = await resend.emails.send({
              from: "Paper & Ink <reminders@resend.dev>",
              to: [userEmail],
              subject: "🌙 Time to Wind Down",
              html: `
                <div style="font-family: Georgia, serif; max-width: 500px; margin: 0 auto; padding: 20px; background: #fffbf5;">
                  <h1 style="color: #4a5568; font-size: 24px; margin-bottom: 16px;">Time to Wind Down 🌙</h1>
                  <p style="color: #718096; line-height: 1.6;">
                    It's almost bedtime! Consider putting away devices and preparing for a peaceful night.
                  </p>
                  <p style="color: #718096; line-height: 1.6;">
                    Maybe it's time for a cozy bedtime story?
                  </p>
                  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                  <p style="color: #a0aec0; font-size: 12px; text-align: center;">
                    <a href="${disableBedtimeUrl}" style="color: #a0aec0; margin-right: 16px;">Stop bedtime reminders</a>
                    <a href="${disableAllUrl}" style="color: #a0aec0;">Unsubscribe from all</a>
                  </p>
                </div>
              `,
            });

            if (sendError) {
              console.error(`Failed to send bedtime email to ${userEmail}:`, sendError);
              errors.push(`bedtime_send:${setting.user_id}`);
            } else {
              sentCount++;
              processed.push(`bedtime:${setting.user_id}`);
            }
          }
        }

        // Check story reminder
        if (setting.story_enabled && setting.story_time) {
          const [storyHours, storyMinutes] = setting.story_time.split(":").map(Number);
          const roundedStoryMinutes = Math.floor(storyMinutes / 10) * 10;
          const storyTimeStr = `${storyHours.toString().padStart(2, "0")}:${roundedStoryMinutes.toString().padStart(2, "0")}`;

          if (userTimeStr === storyTimeStr) {
            console.log(`Sending story reminder to ${userEmail}`);
            
            // Generate secure tokens for unsubscribe links
            const disableAllToken = await generateSecureDisableToken(supabase, setting.user_id, 'all');
            const disableStoryToken = await generateSecureDisableToken(supabase, setting.user_id, 'story');
            
            const disableAllUrl = `${functionsUrl}/disable-reminders?token=${disableAllToken}`;
            const disableStoryUrl = `${functionsUrl}/disable-reminders?token=${disableStoryToken}`;
            
            const { error: sendError } = await resend.emails.send({
              from: "Paper & Ink <reminders@resend.dev>",
              to: [userEmail],
              subject: "✨ Story Time Awaits!",
              html: `
                <div style="font-family: Georgia, serif; max-width: 500px; margin: 0 auto; padding: 20px; background: #fffbf5;">
                  <h1 style="color: #4a5568; font-size: 24px; margin-bottom: 16px;">Story Time Awaits! ✨</h1>
                  <p style="color: #718096; line-height: 1.6;">
                    Your heroes are waiting for their next adventure. Ready to create some bedtime magic?
                  </p>
                  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                  <p style="color: #a0aec0; font-size: 12px; text-align: center;">
                    <a href="${disableStoryUrl}" style="color: #a0aec0; margin-right: 16px;">Stop story reminders</a>
                    <a href="${disableAllUrl}" style="color: #a0aec0;">Unsubscribe from all</a>
                  </p>
                </div>
              `,
            });

            if (sendError) {
              console.error(`Failed to send story email to ${userEmail}:`, sendError);
              errors.push(`story_send:${setting.user_id}`);
            } else {
              sentCount++;
              processed.push(`story:${setting.user_id}`);
            }
          }
        }
      } catch (userError) {
        console.error(`Error processing user ${setting.user_id}:`, userError);
        errors.push(`process:${setting.user_id}`);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`=== COMPLETED: Sent ${sentCount} emails, ${errors.length} errors, ${duration}ms ===`);

    return jsonResponse({
      sent: sentCount,
      checked: reminderSettings.length,
      processed,
      errors: errors.length > 0 ? errors : undefined,
      duration_ms: duration,
    });

  } catch (error) {
    console.error("Reminder function fatal error:", error);
    return errorResponse(
      "Unexpected error",
      500,
      error instanceof Error ? error.message : "Unknown error",
    );
  }
});
