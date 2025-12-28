import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple HMAC-like token generation using Web Crypto API
async function generateToken(userId: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(userId + Date.now().toString().slice(0, -5)); // 10-second window
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

async function verifyToken(userId: string, token: string, secret: string): Promise<boolean> {
  // Check current and previous time windows
  for (let i = 0; i < 6; i++) { // Allow 1 hour window for email clicks
    const encoder = new TextEncoder();
    const timestamp = (Date.now() - i * 10000).toString().slice(0, -5);
    const data = encoder.encode(userId + timestamp);
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", key, data);
    const expectedToken = btoa(String.fromCharCode(...new Uint8Array(signature))).slice(0, 32);
    if (token === expectedToken) return true;
  }
  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("user");
    const token = url.searchParams.get("token");
    const type = url.searchParams.get("type"); // "all", "bedtime", or "story"

    if (!userId || !token) {
      return new Response(renderHTML("Invalid link", "error"), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "text/html" },
      });
    }

    const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const isValid = await verifyToken(userId, token, secret);

    if (!isValid) {
      return new Response(renderHTML("This link has expired. Please use the settings in the app to manage reminders.", "error"), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "text/html" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

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

    const { error } = await supabase
      .from("reminder_settings")
      .update(updateData)
      .eq("user_id", userId);

    if (error) {
      console.error("Failed to update settings:", error);
      return new Response(renderHTML("Failed to update settings. Please try again.", "error"), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "text/html" },
      });
    }

    const message = type === "all" || !type 
      ? "All email reminders have been disabled." 
      : `${type.charAt(0).toUpperCase() + type.slice(1)} reminders have been disabled.`;

    return new Response(renderHTML(message, "success"), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/html" },
    });

  } catch (error) {
    console.error("Disable reminders error:", error);
    return new Response(renderHTML("An error occurred. Please try again.", "error"), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "text/html" },
    });
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
