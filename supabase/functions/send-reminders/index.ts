import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("resend");
    if (!resendApiKey) {
      console.error("RESEND API key not configured");
      return new Response(JSON.stringify({ error: "Resend not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resend = new Resend(resendApiKey);

    // Create admin client to access all users
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get current UTC time
    const now = new Date();
    const currentMinutes = now.getUTCMinutes();
    
    // Only run on 10-minute intervals (0, 10, 20, 30, 40, 50)
    if (currentMinutes % 10 !== 0) {
      console.log("Skipping - not on 10-minute interval");
      return new Response(JSON.stringify({ skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Running reminder check at", now.toISOString());

    // Fetch all reminder settings where email_opt_in is true
    const { data: reminderSettings, error: fetchError } = await supabase
      .from("reminder_settings")
      .select("*")
      .eq("email_opt_in", true)
      .or("bedtime_enabled.eq.true,story_enabled.eq.true");

    if (fetchError) {
      console.error("Failed to fetch reminder settings:", fetchError);
      return new Response(JSON.stringify({ error: "Failed to fetch settings" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!reminderSettings || reminderSettings.length === 0) {
      console.log("No active reminder settings found");
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Found ${reminderSettings.length} users with reminders enabled`);

    let sentCount = 0;
    const errors: string[] = [];

    for (const setting of reminderSettings) {
      try {
        // Get user email
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(setting.user_id);
        
        if (userError || !userData?.user?.email) {
          console.error(`Failed to get user email for ${setting.user_id}:`, userError);
          continue;
        }

        const userEmail = userData.user.email;
        const userTimezone = setting.timezone || "UTC";

        // Get current time in user's timezone
        const userNow = new Date(now.toLocaleString("en-US", { timeZone: userTimezone }));
        const userHours = userNow.getHours().toString().padStart(2, "0");
        const userMinutes = Math.floor(userNow.getMinutes() / 10) * 10; // Round to 10-min interval
        const userTimeStr = `${userHours}:${userMinutes.toString().padStart(2, "0")}`;

        console.log(`User ${setting.user_id}: local time is ${userTimeStr}, timezone ${userTimezone}`);

        // Check bedtime reminder
        if (setting.bedtime_enabled && setting.bedtime_time) {
          const [bedHours, bedMinutes] = setting.bedtime_time.split(":").map(Number);
          const roundedBedMinutes = Math.floor(bedMinutes / 10) * 10;
          const bedTimeStr = `${bedHours.toString().padStart(2, "0")}:${roundedBedMinutes.toString().padStart(2, "0")}`;

          if (userTimeStr === bedTimeStr) {
            console.log(`Sending bedtime reminder to ${userEmail}`);
            
            const { error: sendError } = await resend.emails.send({
              from: "Paper & Ink <reminders@resend.dev>",
              to: [userEmail],
              subject: "🌙 Time to Wind Down",
              html: `
                <div style="font-family: Georgia, serif; max-width: 500px; margin: 0 auto; padding: 20px;">
                  <h1 style="color: #4a5568; font-size: 24px;">Time to Wind Down 🌙</h1>
                  <p style="color: #718096; line-height: 1.6;">
                    It's almost bedtime! Consider putting away devices and preparing for a peaceful night.
                  </p>
                  <p style="color: #718096; line-height: 1.6;">
                    Maybe it's time for a cozy bedtime story?
                  </p>
                  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                  <p style="color: #a0aec0; font-size: 12px;">
                    <a href="${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovableproject.com')}/dashboard" style="color: #667eea;">Open Paper & Ink</a>
                    &nbsp;|&nbsp;
                    <a href="${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovableproject.com')}/dashboard?disable_reminders=true" style="color: #a0aec0;">Disable reminders</a>
                  </p>
                </div>
              `,
            });

            if (sendError) {
              console.error(`Failed to send bedtime email to ${userEmail}:`, sendError);
              errors.push(`bedtime:${setting.user_id}`);
            } else {
              sentCount++;
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
            
            const { error: sendError } = await resend.emails.send({
              from: "Paper & Ink <reminders@resend.dev>",
              to: [userEmail],
              subject: "✨ Story Time Awaits!",
              html: `
                <div style="font-family: Georgia, serif; max-width: 500px; margin: 0 auto; padding: 20px;">
                  <h1 style="color: #4a5568; font-size: 24px;">Story Time Awaits! ✨</h1>
                  <p style="color: #718096; line-height: 1.6;">
                    Your heroes are waiting for their next adventure. Ready to create some bedtime magic?
                  </p>
                  <p style="margin-top: 20px;">
                    <a href="${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovableproject.com')}/dashboard" 
                       style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                      Start a Story
                    </a>
                  </p>
                  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                  <p style="color: #a0aec0; font-size: 12px;">
                    <a href="${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovableproject.com')}/dashboard?disable_reminders=true" style="color: #a0aec0;">Disable reminders</a>
                  </p>
                </div>
              `,
            });

            if (sendError) {
              console.error(`Failed to send story email to ${userEmail}:`, sendError);
              errors.push(`story:${setting.user_id}`);
            } else {
              sentCount++;
            }
          }
        }
      } catch (userError) {
        console.error(`Error processing user ${setting.user_id}:`, userError);
        errors.push(`process:${setting.user_id}`);
      }
    }

    console.log(`Sent ${sentCount} reminder emails, ${errors.length} errors`);

    return new Response(JSON.stringify({ 
      sent: sentCount, 
      checked: reminderSettings.length,
      errors: errors.length > 0 ? errors : undefined 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Reminder function error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
