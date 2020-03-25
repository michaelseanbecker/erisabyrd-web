import React from 'react'
import { Link } from 'gatsby'
import logo from '../img/birdlogo.jpg'

const logoStyles = {
  textAlign: 'center',
}

const hrStyles = {
  backgroundColor: '#594c3b',
  height: '1rem',
}

const Navbar = () => (
  <div className="container">
    <div className="container" style={logoStyles} >
      <Link to="/">
        <img src={logo} alt="Erisa Byrd" />
      </Link>
      <hr style={hrStyles} />
    </div>
    <nav className="navbar is-transparent">
      <div className="container">
         <div className="navbar-start">
           <Link className="navbar-item" to="/">
             Home
           </Link>
           <a className="navbar-item" href="http://www.byrdlandcraft.com">
             ByrdLand Craft
           </a>
           <a className="navbar-item" href="/giftcards">
             Gift Cards
           </a>
           <a className="navbar-item" href="http://www.erisacrat.com">
             Erisacrat on Instagram
           </a>
           <div className="navbar-item">
             Contact: readings@erisacrat.com
           </div>
         </div>
         <div className="navbar-end" />
      </div>
    </nav>
  </div>
)

export default Navbar
