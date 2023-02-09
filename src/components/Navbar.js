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
           <a className="navbar-item" href="https://squ.re/2QCWXPo">
             Gift Cards
           </a>
           <a className="navbar-item" href="http://www.erisacrat.com">
             Erisacrat on Instagram
           </a>
           <div className="navbar-item">
             Contact: readings@erisacrat.com
           </div>
          <div className="navbar-item">
            :
           </div>
         </div>
         <div className="navbar-end" />
      </div>
    </nav>
    <div className="container">
      10% of all sessions will help me provide books and charitable donations to support and inspire the love of reading!
    </div>
  </div>
)

export default Navbar
