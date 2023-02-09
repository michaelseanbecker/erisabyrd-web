import React from 'react'
import Helmet from 'react-helmet'

import Navbar from '../components/Navbar'
import './all.sass'

const TemplateWrapper = ({ children }) => (
  <div>
    <Helmet title="Readings with Erisa" />
    <Navbar />
    <div>10% of all money made will go to promote the love of reading and book charities.</div>
    <div>{children}</div>
  </div>
)

export default TemplateWrapper
