import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminDashboardHome from "@/components/admin/AdminDashboardHome";
import AdminWorkouts from "@/components/admin/AdminWorkouts";
import AdminRecipes from "@/components/admin/AdminRecipes";
import AdminContactRequests from "@/components/admin/AdminContactRequests";
import AdminCoachProfile from "@/components/admin/AdminCoachProfile";
import AdminClientList from "@/components/admin/AdminClientList";
import AdminBugReports from "@/components/admin/AdminBugReports";

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("dashboard");

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <AdminDashboardHome onNavigate={setActiveTab} />;
      case "clients":
        return <AdminClientList />;
      case "workouts":
        return <AdminWorkouts />;
      case "recipes":
        return <AdminRecipes />;
      case "contacts":
        return <AdminContactRequests />;
      case "bugs":
        return <AdminBugReports />;
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
