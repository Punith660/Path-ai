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
import CandidateDetails from "./pages/CandidateDetails";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Navigate } from "react-router";
import { useAuth } from "./context/AuthContext";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { ForgotPassword } from "./pages/ForgotPassword";
import { ResetPassword } from "./pages/ResetPassword";

function ProtectedManagerRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== "manager") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function ProtectedRank() {
  return (
    <ProtectedManagerRoute>
      <RankCandidates />
    </ProtectedManagerRoute>
  );
}

function ProtectedRankingHistory() {
  return (
    <ProtectedManagerRoute>
      <RankingHistory />
    </ProtectedManagerRoute>
  );
}

function ProtectedCandidateDetails() {
  return (
    <ProtectedManagerRoute>
      <CandidateDetails />
    </ProtectedManagerRoute>
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
    path: "/forgot-password",
    Component: ForgotPassword,
  },
  {
    path: "/reset-password",
    Component: ResetPassword,
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
        path: "ranking-history/:rankingId/candidate/:candidateId",
        Component: ProtectedCandidateDetails,
      },
      {
        path: "rank/:rankingId/candidate/:candidateId",
        Component: ProtectedCandidateDetails,
      },
      {
        path: "rankings/:rankingId/candidates/:candidateId",
        Component: ProtectedCandidateDetails,
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
