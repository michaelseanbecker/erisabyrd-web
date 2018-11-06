import React from 'react'
import PropTypes from 'prop-types'
import { graphql } from 'gatsby'
import Layout from '../components/Layout'
import Content, { HTMLContent } from '../components/Content'

export const SlonePageTemplate = ({ title, content, contentComponent }) => {
  const PageContent = contentComponent || Content
  const styles = {
    backgroundColor: '#1E93CC',
    color: 'white',
    height: '40px',
    textTransform: 'uppercase',
    fontFamily: "'Square Market', 'helvetica neue', helvetica, arial, sans-serif",
    letterSpacing: '1px',
    lineHeight: '38px',
    padding: '0 28px',
    borderRadius: '3px',
    fontWeight: '500',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'inline-block',
  }
  return (
    <section className="section section--gradient">
      <div className="container">
        <div className="columns">
          <div className="column is-8">
            <div className="section">
              <h2 className="title is-size-10 has-text-weight-bold is-bold-light">
                {title}
              </h2>
              <div >
                <a target="_top" style={styles} href="https://squareup.com/appointments/book/VJPGPX1ZF2ZGC/readings-with-erisa-at-slone-vintage-burbank-ca" rel="nofollow">Schedule a Reading</a>
              </div>
              <PageContent className="content" content={content} />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

SlonePageTemplate.propTypes = {
  title: PropTypes.string.isRequired,
  content: PropTypes.string,
  contentComponent: PropTypes.func,
}

const SlonePage = ({ data }) => {
  const { markdownRemark: post } = data

  return (
    <Layout>
      <SlonePageTemplate
        contentComponent={HTMLContent}
        title={post.frontmatter.title}
        content={post.html}
      />
    </Layout>
  )
}

SlonePage.propTypes = {
  data: PropTypes.object.isRequired,
}

export default SlonePage

export const SlonePageQuery = graphql`
  query SlonePage($id: String!) {
    markdownRemark(id: { eq: $id }) {
      html
      frontmatter {
        title
      }
    }
  }
`
