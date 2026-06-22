import { createBrowserRouter } from "react-router";
import { DashboardLayout } from "./components/DashboardLayout";
import { Upload } from "./pages/Upload";
import { Summary } from "./pages/Summary";
import { Skills } from "./pages/Skills";
import { Evidence } from "./pages/Evidence";
import { Reports } from "./pages/Reports";
import { Settings } from "./pages/Settings";
import { Help } from "./pages/Help";
import RankCandidates from "./pages/RankCandidates";
import RankingHistory from "./pages/RankingHistory";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";

function ProtectedRank() {
  return (
    <ProtectedRoute>
      <RankCandidates />
    </ProtectedRoute>
  );
}

function ProtectedRankingHistory() {
  return (
    <ProtectedRoute>
      <RankingHistory />
    </ProtectedRoute>
  );
}

function ProtectedDashboardLayout() {
  return (
    <ProtectedRoute>
      <DashboardLayout />
    </ProtectedRoute>
  );
}

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/register",
    Component: Register,
  },
  {
    path: "/",
    Component: ProtectedDashboardLayout,
    children: [
      {
        index: true,
        Component: Upload,
      },
      {
        path: "summary",
        Component: Summary,
      },
      {
        path: "skills",
        Component: Skills,
      },
      {
        path: "evidence",
        Component: Evidence,
      },
      {
        path: "reports",
        Component: Reports,
      },
      {
        path: "rank",
        Component: ProtectedRank,
      },
      {
        path: "ranking",
        Component: ProtectedRank,
      },
      {
        path: "ranking-history",
        Component: ProtectedRankingHistory,
      },
      {
        path: "settings",
        Component: Settings,
      },
      {
        path: "help",
        Component: Help,
      },
    ],
  },
], {
  basename: import.meta.env.BASE_URL,
});
