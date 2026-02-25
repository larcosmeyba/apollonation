import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminWorkouts from "@/components/admin/AdminWorkouts";
import AdminRecipes from "@/components/admin/AdminRecipes";
import AdminExercises from "@/components/admin/AdminExercises";
import AdminUsers from "@/components/admin/AdminUsers";
import AdminMessages from "@/components/admin/AdminMessages";
import AdminContactRequests from "@/components/admin/AdminContactRequests";
import AdminNutrition from "@/components/admin/AdminNutrition";
import AdminBroadcast from "@/components/admin/AdminBroadcast";
import AdminCoachProfile from "@/components/admin/AdminCoachProfile";
import AdminClientPlans from "@/components/admin/AdminClientPlans";
import AdminClientNotes from "@/components/admin/AdminClientNotes";

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("messages");

  const renderContent = () => {
    switch (activeTab) {
      case "messages":
        return <AdminMessages />;
      case "broadcast":
        return <AdminBroadcast />;
      case "client-plans":
        return <AdminClientPlans />;
      case "client-notes":
        return <AdminClientNotes />;
      case "workouts":
        return <AdminWorkouts />;
      case "exercises":
        return <AdminExercises />;
      case "users":
        return <AdminUsers />;
      case "recipes":
        return <AdminRecipes />;
      case "nutrition":
        return <AdminNutrition />;
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
