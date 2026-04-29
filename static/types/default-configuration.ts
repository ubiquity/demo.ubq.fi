const defaultConfiguration: { plugins: Record<string, unknown> } = {
  plugins: {
    "ubiquity-os-marketplace/command-start-stop@demo": {
      with: {
        taskAccessControl: {
          experience: {
            priorityThresholds: [
              {
                label: "Priority: 0 (Regression)",
                minimumXp: 0,
              },
              {
                label: "Priority: 1 (Normal)",
                minimumXp: 0,
              },
              {
                label: "Priority: 2 (Medium)",
                minimumXp: 0,
              },
              {
                label: "Priority: 3 (High)",
                minimumXp: 0,
              },
              {
                label: "Priority: 4 (Urgent)",
                minimumXp: 0,
              },
              {
                label: "Priority: 5 (Emergency)",
                minimumXp: 0,
              },
            ],
          },
        },
      },
    },
    "ubiquity-os/command-demo@demo": null,
    "ubiquity-os-marketplace/command-wallet@demo": null,
    "ubiquity-os-marketplace/command-query@demo": null,
    "ubiquity-os-marketplace/text-conversation-rewards@demo": {
      with: {
        incentives: {
          collaboratorOnlyPaymentInvocation: false,
          contentEvaluator: {},
          userExtractor: {},
          dataPurge: {},
          formattingEvaluator: {},
          payment: {},
          githubComment: {},
          reviewIncentivizer: {},
          simplificationIncentivizer: {},
          externalContent: {},
        },
      },
    },
    "ubiquity-os-marketplace/daemon-disqualifier@demo": null,
    "ubiquity-os-marketplace/text-vector-embeddings@demo": {
      with: {
        demoFlag: true,
      },
    },
  },
};
export default defaultConfiguration;
