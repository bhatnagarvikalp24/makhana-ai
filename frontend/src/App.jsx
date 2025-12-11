import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast'; // <--- 1. IMPORT THIS

import Landing from './pages/Landing';
import UserForm from './pages/UserForm';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Grocery from './pages/Grocery';
import PlanList from './pages/PlanList'; 
import ComingSoon from './pages/ComingSoon'; 

function App() {
  return (
    <BrowserRouter>
      {/* 2. ADD THE TOASTER COMPONENT HERE */}
      <Toaster position="top-center" reverseOrder={false} />

      <Routes>
        {/* Public Landing Page */}
        <Route path="/" element={<Landing />} />
        
        {/* Create New Plan (Guest Flow) */}
        <Route path="/start" element={<UserForm />} />
        
        {/* Login Page */}
        <Route path="/login" element={<Login />} />
        
        {/* List of Saved Plans (After Login) */}
        <Route path="/my-plans" element={<PlanList />} /> 
        
        {/* The Actual Plan Dashboard */}
        <Route path="/plan" element={<Dashboard />} />
        
        {/* Grocery List View */}
        <Route path="/grocery" element={<Grocery />} />

        {/* E-Commerce Coming Soon Page */}
        <Route path="/coming-soon" element={<ComingSoon />} /> 
      </Routes>
    </BrowserRouter>
  );
}

export default App;