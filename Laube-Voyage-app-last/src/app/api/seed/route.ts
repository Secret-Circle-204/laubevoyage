// ========================================
// 📊 COMPREHENSIVE SEED DATA FOR L'AUBE VOYAGE
// ========================================
// NOTE: This route is currently disabled
// Media (images) must be uploaded manually via Admin Panel
// This seed creates records without images first, then you can add images via Admin

export async function GET() {
  return new Response(JSON.stringify({ message: 'Seed route is disabled' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
