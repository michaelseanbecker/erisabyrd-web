import React from 'react'
import { Link } from 'gatsby'
import logo from '../img/birdlogo.jpg'

const Navbar = () => (
  <div className="container">
    <div className="container">
      <img src={logo} alt="Erisa Byrd" />
    </div>
    <nav className="navbar is-transparent">
      <div className="container">
         <div className="navbar-start">
           <a className="navbar-item" href="http://www.byrdlandcraft.com">
             ByrdLand Craft
           </a>
           <a className="navbar-item" href="http://www.erisacrat.com">
             Erisacrat on Instagram
           </a>
           <Link className="navbar-item" to="/schedule">
             Schedule a Reading
           </Link>
         </div>
         <div className="navbar-end" />
      </div>
    </nav>
  </div>
)

export default Navbar
