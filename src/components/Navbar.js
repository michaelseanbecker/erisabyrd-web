import path from "path";
import fs from "fs";
import CaseSensitivePathsPlugin from "case-sensitive-paths-webpack-plugin";
import { BundleAnalyzerPlugin } from "webpack-bundle-analyzer";
import groupBy from "lodash/groupBy";

// Gatsby
import {
  createPlanNodes,
  createProductNodes,
  createPromotionNodes,
  createStoreNodes,
  createProductGroupingNodes,
} from "./gatsby-source-nodes";

// Data
import locales from "./config/locales";
import aliasModules from "./config/alias.js";
import { activeEnv } from "./config/assignActiveEnv";

// Utils
import config from "./src/utils/siteConfig";
import {
  // generateBannerRedirects,
  createStaticRedirectsForLocale,
} from "./src/utils/gatsbyBuild";

let activeLocales = [];

export function onCreateWebpackConfig({ stage, getConfig, actions, plugins }) {
  actions.setWebpackConfig({
    resolve: {
      alias: aliasModules,
      fallback: {
        crypto: false,
        url: false,
      },
    },
    plugins: [
      new CaseSensitivePathsPlugin(),
      process.env.ANALYZE_BUNDLE &&
        new BundleAnalyzerPlugin({
          analyzerPort: 4150,
        }),
    ].filter((p) => p),
  });
}

export function createSchemaCustomization({ actions }) {
  const { createTypes } = actions;
  // Ensure the attributes and relationships are defined as type
  // JSON so they do not need to be expanded in all GraphQL queries.
  const typeDefs = `
    type Product implements Node {
      attributes: JSON
      relationships: JSON
    }
    type ProductGrouping implements Node {
      attributes: JSON
      relationships: JSON
    }
    type Plan implements Node {
      attributes: JSON
      relationships: JSON
    }
    type Promotion implements Node {
      attributes: JSON
      relationships: JSON
    }
    type IngredientStoryContent implements Node {
      attributes: JSON
      relationships: JSON
      description: String
      title: String
    }
    type ProductReviewUser implements Node {
      user_id: Int
      display_name: String
      social_image: String
    }
    type ProductReviewComment implements Node {
      id: String
      content: String
      created_at: String
    }
    type ProductReview implements Node {
      product_id: String
      id: String
      score: Int
      votes_up: Int
      votes_down: Int
      content: String
      title: String
      sentiment: Float
      created_at: String
      verified_buyer: Boolean
      social_image: String
      user_type: String
      is_social_connected: Int
      display_name: String
      parent: String
      would_recommend: String
      received_product: String
      age_range: String
      subscription_age: String
      sticker: String
      user: ProductReviewUser
      comment: ProductReviewComment
      children: [String]
    }
  `;
  createTypes(typeDefs);

  return Promise.all([
    createPlanNodes(actions),
    createProductNodes(actions),
    createProductGroupingNodes(actions),
    createStoreNodes(actions),
  ]);
}

export function createResolvers({ createResolvers }) {
  const resolvers = {
    ContentfulDiscountPage: {
      scope: {
        type: `String`,
        resolve(source, args, context, info) {
          if (!source.scope) {
            return undefined;
          }
          return info.originalResolver(source, args, context, info);
        },
      },
      typeformSurveyUrl: {
        type: `String`,
        resolve(source, args, context, info) {
          if (!source.typeformSurveyUrl) {
            return undefined;
          }
          return info.originalResolver(source, args, context, info);
        },
      },
    },
    // ContentfulBanner: {
    //   redirectPath: {
    //     type: `String`,
    //     resolve(source, args, context, info) {
    //       if (!source.redirectPath) {
    //         return undefined;
    //       }
    //       return info.originalResolver(source, args, context, info);
    //     },
    //   },
    // },
    ContentfulIngredient: {
      ingredientStoryContent: {
        type: `IngredientStoryContent`,
        resolve(source, args, context, info) {
          if (!source.ingredientStoryContent) {
            return undefined;
          }
          return info.originalResolver(source, args, context, info);
        },
      },
      ingredientStoryImages: {
        type: `ContentfulAsset`,
        resolve(source, args, context, info) {
          if (!source.ingredientStoryImages) {
            return [];
          }
          return info.originalResolver(source, args, context, info);
        },
      },
    },
  };
  createResolvers(resolvers);
}

function _createPagesForDir(createPage, filePath, locale, routePrefix = "") {
  return new Promise((resolve) => {
    const promises = [];
    fs.readdir(`${filePath}`, (_, files) => {
      files.forEach((file) => {
        // Ignore __tests__ directory.
        if (file === "__tests__") return;

        const fileName = file.split(".js")[0];
        let route = routePrefix ? `${routePrefix}/${fileName}` : fileName;

        // If the current file is a directory, ensure should create a nested
        // route for the files inside the directory.
        const isDirectory = fs.lstatSync(`${filePath}/${file}`).isDirectory();
        if (isDirectory) {
          promises.push(
            _createPagesForDir(
              createPage,
              `${filePath}/${fileName}`,
              locale,
              // For nested routes, the current route should be the new prefix.
              route,
            ),
          );
          return;
        }

        // Any files named "index" should have be treated as an empty route.
        route = route.replace("index", "");

        createPage({
          path: `${locales[locale].path}/${route}`,
          component: path.resolve(`${filePath}/${file}`),
          context: _getPageContext(locale),
        });
      });
    });

    // Resolve once all nested routes have been generated.
    return Promise.all(promises).then(resolve);
  });
}

export async function createPages({ graphql, actions }) {
  // Get the Contentful locales that are currently enabled for content delivery.
  const contentfulLocales = await _getContentfulLocales(graphql);

  // Only generate pages that for locales that have corresponding Contentful
  // content.
  activeLocales = Object.keys(locales).filter((locale) =>
    contentfulLocales.includes(locale),
  );

  return Promise.all(
    activeLocales.map((locale) =>
      Promise.all([
        createStaticRedirectsForLocale(actions, locale),
        _createPagesForLocale({ graphql, actions }, locale),
      ]),
    ),
  );
}

function _createPagesForLocale({ graphql, actions }, locale) {
  const { createPage, createRedirect } = actions;
  const loadRoutes = _createPagesForDir(
    createPage,
    "./src/templates/routes",
    locale,
  );

  const loadIngredientPages = new Promise((resolve, reject) => {
    graphql(`
      {
        allContentfulIngredient {
          nodes {
            node_locale
            slug
            locationGroup
            name
            location {
              lat
              lon
            }
          }
        }
      }
    `).then((result) => {
      _filterByLocale(result.data.allContentfulIngredient.nodes, locale).map(
        (node) => {
          // Don't create a page for ingredients that don't have a slug.
          if (!node.slug) return;

          createPage({
            path: `${locales[locale].path}/ingredients/${node.slug}`,
            component: path.resolve(`./src/templates/ingredientsPage.js`),
            context: _getPageContext(locale, {
              slug: node.slug,
            }),
          });
        },
      );

      const locations = groupBy(
        _filterByLocale(result.data.allContentfulIngredient.nodes, locale),
        (node) => {
          return node.locationGroup;
        },
      );
      // Remove any ingredients without a specified locationGroup.
      delete locations[null];

      for (const [locationGroup, ingredients] of Object.entries(locations)) {
        const locationPath = locationGroup
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");

        createPage({
          path: `${locales[locale].path}/ingredients/map/${locationPath}`,
          component: path.resolve(`./src/templates/ingredientsMap.js`),
          context: _getPageContext(locale, {
            locationGroup: locationGroup,
            locations: locations,
            locationPath: locationPath,
            ingredientsListPageId: "4wJg1DbUMwMUo0UuUS6cO2",
          }),
        });
      }

      resolve();
    });
  });

  const loadProductPages = new Promise((resolve, reject) => {
    graphql(`
      {
        allContentfulProduct {
          nodes {
            node_locale
            slug
            contentful_id
            sku
            name {
              name
            }
            productSubhead
          }
        }
        allProduct {
          nodes {
            id
            sku
            contentful_id
            attributes
            relationships
          }
        }
        allProductGrouping {
          nodes {
            id
            attributes
            relationships
          }
        }
        allPlan {
          nodes {
            id
            product_id
          }
        }
      }
    `).then((result) => {
      _filterByLocale(result.data.allContentfulProduct.nodes, locale).map(
        (node) => {
          const products = result.data.allProduct.nodes;
          const productGroups = result.data.allProductGrouping.nodes;
          const plans = result.data.allPlan.nodes;

          const defaultProducts = products.filter((p) => {
            const productGroupId = p.relationships.product_group.data
              ? p.relationships.product_group.data.id
              : null;
            if (!productGroupId) return true;

            const productGroup = productGroups.find(
              (pg) => pg.id === productGroupId,
            );
            const defaultProductId =
              productGroup.relationships.default_product.data.id;
            return defaultProductId === p.id;
          });

          const currentProduct = defaultProducts.find((product) => {
            // Use contentful_id only if variants do not have the same contentful_id
            return product.contentful_id === node.contentful_id;
          });

          if (!currentProduct) {
            return console.error("Not building PDP for ", node.sku);
          }

          const hasPlan = plans.find(
            (plan) => plan.product_id === currentProduct.id,
          );

          if (!hasPlan) {
            return console.error("No product id specified", node.sku);
          }

          let productId = currentProduct.id;
          let productSku = currentProduct.sku;

          createPage({
            path: `${locales[locale].path}/products/${node.slug}`,
            component: path.resolve(`./src/templates/productPage.js`),
            context: _getPageContext(locale, {
              slug: node.slug,
              productId: productId,
              productType: productSku,
            }),
          });
          resolve();
        },
      );
    });
  });

  const loadArticleCategories = new Promise((resolve, reject) => {
    graphql(`
      {
        allContentfulFeaturedCategory {
          nodes {
            node_locale
            contentful_id
            category {
              slug
              subcategories {
                key
              }
            }
          }
        }
      }
    `).then((result) => {
      _filterByLocale(
        result.data.allContentfulFeaturedCategory.nodes,
        locale,
      ).map((node) => {
        const { category } = node;
        if (!category) return;

        const { slug, subcategories } = category;
        const categorySlug = `${locales[locale].path}/articles/categories/${slug}`;

        // Create category pages
        createPage({
          path: categorySlug,
          component: path.resolve(
            `./src/templates/contentfulArticleCategory.js`,
          ),
          context: _getPageContext(locale, {
            contentfulId: node.contentful_id,
          }),
        });

        // Create subcategory pages
        subcategories &&
          subcategories.map((subcategory) => {
            const { key } = subcategory;
            createPage({
              path: `${categorySlug}/${key}`,
              component: path.resolve(
                `./src/templates/contentfulArticleSubcategory.js`,
              ),
              context: _getPageContext(locale, {
                category: slug,
                subcategory: key,
              }),
            });
          });
      });
      resolve();
    });
  });

  const loadFreeformArticles = new Promise((resolve, reject) => {
    graphql(`
      {
        allContentfulArticleFreeform {
          nodes {
            node_locale
            slug
            previewText
          }
        }
      }
    `).then((result) => {
      _filterByLocale(
        result.data.allContentfulArticleFreeform.nodes,
        locale,
      ).map((node) => {
        // We only want to display these articles in Staging environment
        const stagingArticles = ["style-guide", "video-style-guide"];
        if (stagingArticles.includes(node.slug) && activeEnv !== "staging")
          return;

        createPage({
          path: `${locales[locale].path}/${config.contentHubArticlesUrl}/${node.slug}`,
          component: path.resolve(
            `./src/templates/contentfulFreeformArticle.js`,
          ),
          context: _getPageContext(locale, {
            slug: node.slug,
          }),
        });
      });
      resolve();
    });
  });

  const loadBasicPages = new Promise((resolve, reject) => {
    graphql(`
      {
        allContentfulPageBasic(filter: { type: { eq: "basic" } }) {
          nodes {
            node_locale
            slug
          }
        }
      }
    `).then((result) => {
      _filterByLocale(result.data.allContentfulPageBasic.nodes, locale).map(
        (node) => {
          createPage({
            path: `${locales[locale].path}/${node.slug}`,
            component: path.resolve(`./src/templates/contentfulBasicPage.js`),
            context: _getPageContext(locale, {
              slug: node.slug,
            }),
          });
        },
      );
      resolve();
    });
  });

  const loadPolicyPages = new Promise((resolve, reject) => {
    graphql(`
      {
        allContentfulPageBasic(filter: { type: { eq: "policy" } }) {
          nodes {
            node_locale
            slug
          }
        }
      }
    `).then((result) => {
      _filterByLocale(result.data.allContentfulPageBasic.nodes, locale).map(
        (node) => {
          createPage({
            path: `${locales[locale].path}/${node.slug}`,
            component: path.resolve(
              `./src/templates/contentfulPoliciesPage.js`,
            ),
            context: _getPageContext(locale, {
              slug: node.slug,
            }),
          });
        },
      );
      resolve();
    });
  });

  // const createBannerRedirects = new Promise((resolve, reject) => {
  //   graphql(`
  //     {
  //       allContentfulBanner {
  //         nodes {
  //           node_locale
  //           content {
  //             childMarkdownRemark {
  //               html
  //             }
  //           }
  //           utmSource
  //           utmMedium
  //           utmCampaign
  //           utmContent
  //           vanityUrl
  //           redirectPath
  //         }
  //       }
  //     }
  //   `).then((result) => {
  //     _filterByLocale(result.data.allContentfulBanner.nodes, locale).map(
  //       (node) => {
  //         if (node.vanityUrl)
  //           // Prevents empty banner records from being built
  //           generateBannerRedirects(node, node.node_locale).map((res) =>
  //             createRedirect(res),
  //           );
  //       },
  //     );
  //     resolve();
  //   });
  // });

  const loadDiscountPages = new Promise((resolve, reject) => {
    graphql(`
      {
        allContentfulDiscountPage {
          nodes {
            node_locale
            slug
            hideInLocale
          }
        }
      }
    `).then((result) => {
      _filterByLocale(result.data.allContentfulDiscountPage.nodes, locale).map(
        (node) => {
          if (node.hideInLocale) return;

          createPage({
            path: `${locales[locale].path}/${node.slug}`,
            component: path.resolve(`./src/templates/discountPage.js`),
            context: _getPageContext(locale, {
              slug: node.slug,
            }),
          });
        },
      );
      resolve();
    });
  });

  const loadShopLandingPages = new Promise((resolve, reject) => {
    graphql(`
      {
        allContentfulShopLandingPage {
          nodes {
            node_locale
            slug
          }
        }
      }
    `).then((result) => {
      _filterByLocale(
        result.data.allContentfulShopLandingPage.nodes,
        locale,
      ).map((node) => {
        createPage({
          path: `${locales[locale].path}/${node.slug}`,
          component: path.resolve(`./src/templates/scalableShopLandingPage.js`),
          context: _getPageContext(locale, {
            slimFooter: true,
            slug: node.slug,
          }),
        });
      });
      resolve();
    });
  });

  const loadBundlingIncentivePages = new Promise((resolve, reject) => {
    graphql(`
      {
        allProduct {
          nodes {
            id
            sku
          }
        }
        allPlan {
          nodes {
            id
            amount
            currency
            nickname
            product_id
          }
        }
        allContentfulBundlingIncentivePage {
          nodes {
            node_locale
            slug
            products {
              contentful_id
              sku
            }
          }
        }
      }
    `)
      .then((result) => {
        if (!result.data.allContentfulBundlingIncentivePage) {
          resolve();
        }

        result.data.allContentfulBundlingIncentivePage.nodes.map((node) => {
          createPage({
            path: `${locales[locale].path}/${node.slug}`,
            component: path.resolve(`./src/templates/bundlingIncentivePage.js`),
            context: _getPageContext(locale, {
              slimFooter: true,
              slug: node.slug,
            }),
          });
        });
        resolve();
      })
      .catch(() => {
        resolve();
      });
  });

  const loadBundleLandingPages = new Promise((resolve, reject) => {
    graphql(`
      {
        allProduct {
          nodes {
            id
            sku
          }
        }
        allPlan {
          nodes {
            id
            amount
            currency
            nickname
            product_id
          }
        }
        allContentfulBundleLandingPage {
          nodes {
            node_locale
            slug
            productBundles {
              products {
                sku
              }
            }
          }
        }
      }
    `)
      .then((result) => {
        const backendProducts = result.data.allProduct.nodes;
        const backendPlans = result.data.allPlan.nodes;

        if (!result.data.allContentfulBundleLandingPage) {
          resolve();
        }

        _filterByLocale(
          result.data.allContentfulBundleLandingPage.nodes,
          locale,
        ).map((node) => {
          createPage({
            path: `${locales[locale].path}/${node.slug}`,
            component: path.resolve(
              `./src/templates/scalableBundleLandingPage.js`,
            ),
            context: _getPageContext(locale, {
              slug: node.slug,
            }),
          });
        });
        resolve();
      })
      .catch(() => {
        resolve();
      });
  });

  const loadRetailPages = new Promise((resolve, reject) => {
    graphql(`
      query RetailLocations {
        allContentfulRetailLocation {
          nodes {
            node_locale
            slug
            contentful_id
            id
          }
        }
      }
    `).then((result) => {
      _filterByLocale(
        result.data.allContentfulRetailLocation.nodes,
        locale,
      ).map((node) => {
        // Only build retail location for US, for now
        if (locale === "en-US") {
          createPage({
            path: `${locales[locale].path}/retail/${node.slug}`,
            component: path.resolve(`./src/templates/retail.js`),
            context: _getPageContext(locale, {
              slug: node.slug,
            }),
          });
        }
        resolve();
      });
    });
  });

  return Promise.all([
    loadRoutes,
    loadProductPages,
    loadIngredientPages,
    loadFreeformArticles,
    loadArticleCategories,
    loadBasicPages,
    loadPolicyPages,
    // createBannerRedirects,
    loadDiscountPages,
    loadShopLandingPages,
    loadBundlingIncentivePages,
    loadBundleLandingPages,
    loadRetailPages,
  ]);
}

async function _getContentfulLocales(graphql) {
  const result = await graphql(`
    {
      allContentfulVersionTracking {
        nodes {
          node_locale
        }
      }
    }
  `);
  return result.data.allContentfulVersionTracking.nodes.map(
    (node) => node.node_locale,
  );
}

function _filterByLocale(nodes, locale) {
  return nodes.filter((node) => {
    if (!node.node_locale) {
      throw new Error(`node is missing a node_locale`);
    }
    return node.node_locale === locale;
  });
}

function _getPageContext(locale, context) {
  return {
    locale,
    netlify: {
      branch: process.env.BRANCH,
    },
    activeLocales,
    ...context,
  };
}
