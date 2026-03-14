import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import WeddingHeader from "./WeddingHeader";

const WeddingHome = lazy(() => import("./WeddingHome"));
const WeddingPredictionSelection = lazy(
  () => import("./WeddingPredictionSelection"),
);
const WeddingCreateEvent = lazy(() => import("./WeddingCreateEvent"));
const WeddingManageEvent = lazy(() => import("./WeddingManageEvent"));
const WeddingResults = lazy(() => import("./WeddingResults"));
const WeddingHostLogin = lazy(() => import("./WeddingHostLogin"));

function AppContent() {
  return (
    <>
      <WeddingHeader />

      <Suspense fallback={<p>Loading...</p>}>
        <Routes>
          <Route path="/" element={<WeddingHome />} />
          <Route path="/weddinghome" element={<WeddingHome />} />
          <Route
            path="/weddingpredictionselection"
            element={<WeddingPredictionSelection />}
          />
          <Route path="/weddingcreateevent" element={<WeddingCreateEvent />} />
          <Route
            path="/wedding/manage/:eventId"
            element={<WeddingManageEvent />}
          />
          <Route path="/weddingresults" element={<WeddingResults />} />
          <Route path="/weddinghostlogin" element={<WeddingHostLogin />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
