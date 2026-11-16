export default defineAppConfig({
  ui: {
    colors: {
      primary: 'orange',
      neutral: 'stone'
    },
    button: {
      // Solid orange buttons get darker on hover (the default fades them, making white text hard to read)
      compoundVariants: [{
        color: 'primary' as const,
        variant: 'solid' as const,
        class: 'hover:bg-(--ui-color-primary-700) active:bg-(--ui-color-primary-800) dark:hover:bg-(--ui-color-primary-300) dark:active:bg-(--ui-color-primary-200)'
      }]
    }
  }
})
