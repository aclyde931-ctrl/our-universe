import { Outlet } from "react-router-dom";
import BottomNavigation from "../components/navigation/BottomNavigation";

function AppLayout() {
  return (
    <div className="min-h-screen bg-[#fff7f9] pb-28">
      <Outlet />
      <BottomNavigation />
    </div>
  );
}

export default AppLayout;
