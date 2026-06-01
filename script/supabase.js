const SUPABASE_URL = "https://ibimfihvynrdjiqtsyrl.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImliaW1maWh2eW5yZGppcXRzeXJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNTM5NzIsImV4cCI6MjA5NTYyOTk3Mn0.8iKoQgoBUrBiaK1CCuGJ14QhrIQV1CYV0f0GW6xvSTQ";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
(async () => {
  const { data, error } = await supabaseClient.from("transactions").select("*");

  console.log("SUPABASE DATA:", data);
  console.log("SUPABASE ERROR:", error);
})();
