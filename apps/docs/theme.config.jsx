export default {
  footer: <p>MIT 2023 © refine.</p>,
  head: ({ title, meta }) => (
    <>
      {meta.description && (
        <meta name="description" content={meta.description}/>
      )}
      {meta.tag && <meta name="keywords" content={meta.tag}/>}
      {meta.author && <meta name="author" content={meta.author}/>}
    </>
  ),
  readMore: 'Read More →',
  postFooter: null,
  darkMode: false,
  navs: [
    {
      url: 'https://github.com/himself65/refine',
      name: 'refine'
    }
  ]
}
