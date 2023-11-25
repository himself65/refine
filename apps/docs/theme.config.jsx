export default {
  logo: <strong>refine</strong>,
  project: {
    link: 'https://github.com/himself65/refine'
  },
  docsRepositoryBase: 'https://github.com/himself65/refine/tree/main/apps/docs',
  footer: {
    text: (
      <span>
        MIT {new Date().getFullYear()} ©{' '} refine.
      </span>
    )
  },
  useNextSeoProps() {
    return {
      titleTemplate: '%s – refine'
    }
  }
}
