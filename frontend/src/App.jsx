import { Routes, Route } from 'react-router-dom';
import Tables from './pages/Tables.jsx';
import Menus from './pages/Menus.jsx';
import Sidebar from './components/Sidebar.jsx';
import './App.css'
function App() {
  return (
    <div className='container'>
      <Sidebar/>
      <div className="content">
        <Routes>
          {/* <Route path="/" element={<Tables />} /> */}
          <Route path="/tables" element={<Tables/>} />
          <Route path="/menus" element={<Menus/>} />
        </Routes>
      </div>
    </div>
  );
}

export default App;