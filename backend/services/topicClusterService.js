const CLUSTER_KEYWORDS = {
  frontend: ['react', 'next', 'nextjs', 'javascript', 'typescript', 'css', 'html', 'ui', 'frontend', 'redux', 'tailwind'],
  backend: ['node', 'express', 'api', 'backend', 'microservice', 'rest', 'graphql', 'spring', 'django', 'flask'],
  ai_ml: ['machine learning', 'deep learning', 'llm', 'ai', 'neural', 'nlp', 'computer vision', 'genai', 'prompt'],
  data: ['data', 'sql', 'database', 'analytics', 'bi', 'spark', 'pandas', 'statistics', 'etl'],
  devops: ['devops', 'docker', 'kubernetes', 'ci/cd', 'aws', 'azure', 'gcp', 'terraform', 'linux'],
  security: ['security', 'cyber', 'pentest', 'owasp', 'auth', 'encryption', 'zero trust'],
};

function normalizeTopic(topic) {
  return String(topic || '').trim().toLowerCase();
}

function deriveTopicCluster(topic) {
  const normalized = normalizeTopic(topic);
  if (!normalized) return 'misc';

  for (const [cluster, keywords] of Object.entries(CLUSTER_KEYWORDS)) {
    if (keywords.some((kw) => normalized.includes(kw))) {
      return cluster;
    }
  }

  return 'misc';
}

module.exports = {
  deriveTopicCluster,
};
