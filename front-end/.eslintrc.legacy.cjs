module.exports = {
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        { group: ['src/**','@/src/**'], message: "Use '@/…' aliases" },
        { group: ['views/**','components/**','pages/**'], message: 'Use @features/* or @shared/*' }
      ]
    }]
  }
}
