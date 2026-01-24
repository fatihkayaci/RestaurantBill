import { NavLink } from 'react-router-dom';
import './Style/Sidebar.css'
function Sidebar(){
    return(
        <div className="sidebar-container">
            <div className="logo">
                <div className="logo-picture">picture</div>
                <div className="logo-text">logo</div>
            </div>
            <NavLink to="/tables" className="nav-item">Masalar</NavLink>
            <NavLink to="/menus" className="nav-item">Menü</NavLink>
        </div>
    )
}
export default Sidebar;