import "./App.css";
import { Link, NavLink, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import NewClaim from "./pages/NewClaim";
import ClaimDetail from "./pages/ClaimDetail";
function App() {
  return (
    <div>
      <header>
        <Link to="/">
          <span>L'ORÉAL</span>
          <span>Claims Intelligence Engine</span>
        </Link>
        <nav>
          <NavLink to="/" end>
            Dashboard
          </NavLink>
          <NavLink to="/new">New Submission</NavLink>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/new" element={<NewClaim />} />
          <Route path="/claims/:id" element={<ClaimDetail />} />
        </Routes>
      </main>
      <footer>Prototype</footer>
    </div>
  );
}

export default App;
