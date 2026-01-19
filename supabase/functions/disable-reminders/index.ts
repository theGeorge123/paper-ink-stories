import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const htmlResponse = (message: string, type: "success" | "error", status = 200) =>
  new Response(renderHTML(message, type), {
    status,
    headers: { ...corsHeaders, "Content-Type": "text/html" },
  });

// Track request attempts for rate limiting
const requestLog: Map<string, number[]> = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 10; // Max 10 attempts per minute per IP

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = requestLog.get(ip) || [];
  const recentTimestamps = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW);
  
  if (recentTimestamps.length >= RATE_LIMIT_MAX) {
    return false;
  }
  
  recentTimestamps.push(now);
  requestLog.set(ip, recentTimestamps);
  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting
    const clientIP = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    if (!checkRateLimit(clientIP)) {
      return htmlResponse(
        "Too many requests. Please try again later.",
        "error",
        429,
      );
    }

    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    // Validate token parameter
    if (!token) {
      return htmlResponse("Invalid link - missing token", "error", 400);
    }

    // Token format validation (URL-safe base64, ~43 chars)
    if (!/^[A-Za-z0-9_-]{40,50}$/.test(token)) {
      return htmlResponse("Invalid link format", "error", 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Look up token in database
    const { data: tokenData, error: tokenError } = await supabase
      .from("unsubscribe_tokens")
      .select("user_id, token_type, expires_at, used_at")
      .eq("token", token)
      .single();

    if (tokenError || !tokenData) {
      console.error("Token lookup failed:", tokenError);
      return htmlResponse(
        "This link is invalid or has already been used. Please use the settings in the app to manage reminders.",
        "error",
        404,
      );
    }

    // Check if token is expired
    if (new Date(tokenData.expires_at) < new Date()) {
      return htmlResponse(
        "This link has expired. Please use the settings in the app to manage reminders.",
        "error",
        410,
      );
    }

    // Check if token was already used
    if (tokenData.used_at) {
      return htmlResponse(
        "This link has already been used. Please use the settings in the app to manage reminders.",
        "error",
        410,
      );
    }

    const userId = tokenData.user_id;
    const type = tokenData.token_type;

    // Build update based on type
    const updateData: Record<string, boolean> = {};
    if (type === "bedtime") {
      updateData.bedtime_enabled = false;
    } else if (type === "story") {
      updateData.story_enabled = false;
    } else {
      // Disable all
      updateData.email_opt_in = false;
      updateData.bedtime_enabled = false;
      updateData.story_enabled = false;
    }

    // Update reminder settings
    const { error: updateError } = await supabase
      .from("reminder_settings")
      .update(updateData)
      .eq("user_id", userId);

    if (updateError) {
      console.error("Failed to update settings:", updateError);
      return htmlResponse("Failed to update settings. Please try again.", "error", 500);
    }

    // Mark token as used
    await supabase
      .from("unsubscribe_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("token", token);

    const message = type === "all" || !type 
      ? "All email reminders have been disabled." 
      : `${type.charAt(0).toUpperCase() + type.slice(1)} reminders have been disabled.`;

    return htmlResponse(message, "success", 200);

  } catch (error) {
    console.error("Disable reminders error:", error);
    return htmlResponse("An error occurred. Please try again.", "error", 500);
  }
});

function renderHTML(message: string, type: "success" | "error"): string {
  const emoji = type === "success" ? "✓" : "✗";
  const color = type === "success" ? "#48bb78" : "#f56565";
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Paper & Ink - Reminders</title>
  <style>
    body {
      font-family: Georgia, serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #f7f3e9 0%, #e8e4da 100%);
    }
    .card {
      background: white;
      border-radius: 16px;
      padding: 40px;
      text-align: center;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
      max-width: 400px;
    }
    .icon {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      font-size: 24px;
      background: ${color}20;
      color: ${color};
    }
    h1 { color: #4a5568; margin: 0 0 10px; font-size: 24px; }
    p { color: #718096; line-height: 1.6; margin: 0; }
    .link { margin-top: 20px; }
    .link a { color: #667eea; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${emoji}</div>
    <h1>${type === "success" ? "Done!" : "Oops!"}</h1>
    <p>${message}</p>
    <div class="link">
      <a href="/">← Back to Paper & Ink</a>
    </div>
  </div>
</body>
</html>
  `;
}
