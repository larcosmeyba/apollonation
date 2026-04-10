import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminDashboardHome from "@/components/admin/AdminDashboardHome";
import AdminWorkouts from "@/components/admin/AdminWorkouts";
import AdminRecipes from "@/components/admin/AdminRecipes";
import AdminMessages from "@/components/admin/AdminMessages";
import AdminContactRequests from "@/components/admin/AdminContactRequests";
import AdminBroadcast from "@/components/admin/AdminBroadcast";
import AdminCoachProfile from "@/components/admin/AdminCoachProfile";
import AdminClientList from "@/components/admin/AdminClientList";
import AdminGroupCoaching from "@/components/admin/AdminGroupCoaching";
import AdminMarketing from "@/components/admin/AdminMarketing";

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("dashboard");

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <AdminDashboardHome onNavigate={setActiveTab} />;
      case "messages":
        return <AdminMessages />;
      case "broadcast":
        return <AdminBroadcast />;
      case "clients":
        return <AdminClientList />;
      case "workouts":
        return <AdminWorkouts />;
      case "recipes":
        return <AdminRecipes />;
      case "group-coaching":
        return <AdminGroupCoaching />;
      case "marketing":
        return <AdminMarketing />;
      case "contacts":
        return <AdminContactRequests />;
      case "profile":
        return <AdminCoachProfile />;
      default:
        return <AdminDashboardHome onNavigate={setActiveTab} />;
    }
  };

  return (
    <AdminLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </AdminLayout>
  );
};

export default AdminDashboard;
