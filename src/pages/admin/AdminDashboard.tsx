import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminWorkouts from "@/components/admin/AdminWorkouts";
import AdminRecipes from "@/components/admin/AdminRecipes";
import AdminExercises from "@/components/admin/AdminExercises";
import AdminMessages from "@/components/admin/AdminMessages";
import AdminContactRequests from "@/components/admin/AdminContactRequests";
import AdminBroadcast from "@/components/admin/AdminBroadcast";
import AdminCoachProfile from "@/components/admin/AdminCoachProfile";
import AdminClientList from "@/components/admin/AdminClientList";

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("messages");

  const renderContent = () => {
    switch (activeTab) {
      case "messages":
        return <AdminMessages />;
      case "broadcast":
        return <AdminBroadcast />;
      case "clients":
        return <AdminClientList />;
      case "workouts":
        return <AdminWorkouts />;
      case "exercises":
        return <AdminExercises />;
      case "recipes":
        return <AdminRecipes />;
      case "contacts":
        return <AdminContactRequests />;
      case "profile":
        return <AdminCoachProfile />;
      default:
        return <AdminMessages />;
    }
  };

  return (
    <AdminLayout activeTab={activeTab} onTabChange={setActiveTab}>
      <div className="max-w-6xl mx-auto">
        {renderContent()}
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
