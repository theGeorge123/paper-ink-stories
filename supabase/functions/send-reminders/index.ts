import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate secure token for disable links
async function generateDisableToken(userId: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(userId + Date.now().toString().slice(0, -5));
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, data);
  return btoa(String.fromCharCode(...new Uint8Array(signature))).slice(0, 32);
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("=== SEND-REMINDERS FUNCTION STARTED ===");
  const startTime = Date.now();

  try {
    // Validate Resend API key
    const resendApiKey = Deno.env.get("resend");
    if (!resendApiKey) {
      console.error("CRITICAL: RESEND API key not configured");
      return new Response(JSON.stringify({ 
        error: "Resend API key not configured",
        action: "Add 'resend' secret in Lovable Cloud settings"
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (resendApiKey.length < 20) {
      console.error("CRITICAL: RESEND API key appears invalid (too short)");
      return new Response(JSON.stringify({ 
        error: "Resend API key appears invalid",
        action: "Check that the 'resend' secret contains a valid API key"
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resend = new Resend(resendApiKey);
    console.log("Resend client initialized");

    // Create admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    if (!serviceRoleKey) {
      console.error("CRITICAL: Service role key not configured");
      return new Response(JSON.stringify({ error: "Service role key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
      return new Response(JSON.stringify({ error: "Failed to fetch settings", details: fetchError }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!reminderSettings || reminderSettings.length === 0) {
      console.log("No users with active reminders found");
      return new Response(JSON.stringify({ sent: 0, checked: 0, duration_ms: Date.now() - startTime }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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

        // Generate secure disable token
        const disableToken = await generateDisableToken(setting.user_id, serviceRoleKey);
        const disableAllUrl = `${functionsUrl}/disable-reminders?user=${setting.user_id}&token=${disableToken}&type=all`;

        // Check bedtime reminder
        if (setting.bedtime_enabled && setting.bedtime_time) {
          const [bedHours, bedMinutes] = setting.bedtime_time.split(":").map(Number);
          const roundedBedMinutes = Math.floor(bedMinutes / 10) * 10;
          const bedTimeStr = `${bedHours.toString().padStart(2, "0")}:${roundedBedMinutes.toString().padStart(2, "0")}`;

          if (userTimeStr === bedTimeStr) {
            console.log(`Sending bedtime reminder to ${userEmail}`);
            
            const disableBedtimeUrl = `${functionsUrl}/disable-reminders?user=${setting.user_id}&token=${disableToken}&type=bedtime`;
            
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
            
            const disableStoryUrl = `${functionsUrl}/disable-reminders?user=${setting.user_id}&token=${disableToken}&type=story`;
            
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

    return new Response(JSON.stringify({ 
      sent: sentCount, 
      checked: reminderSettings.length,
      processed,
      errors: errors.length > 0 ? errors : undefined,
      duration_ms: duration
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Reminder function fatal error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
