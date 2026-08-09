"use client";

// Everything on this page happens in the browser. The site is a static export,
// so there is no server to ask "is this person the owner?" on the way in. The
// answer comes from Firebase Auth once the page is running, and the data is
// only ever handed over by Firestore, which checks the same thing again with
// the rules in firestore.rules.

import AdminDashboard from "@/components/admin/AdminDashboard";

export default function AdminPage() {
  return <AdminDashboard />;
}
