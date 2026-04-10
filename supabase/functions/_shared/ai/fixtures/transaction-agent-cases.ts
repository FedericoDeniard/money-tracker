import { langfuseDatasetGeneratedCases } from "./langfuse-dataset-cases.generated.ts";
import { transactionAgentManualLabels } from "./transaction-agent-labels.ts";

import type { ExpectedTransactionType } from "./transaction-agent-labels.ts";

export interface TransactionAgentIntegrationCase {
  name: string;
  emailContent: string;
  expectedHasTransaction: boolean;
  userFullName?: string;
  userLocale?: string;
  datasetItemId?: string;
  sourceObservationId?: string;
  rationale?: string;
  expectedAmount?: number;
  expectedCurrency?: string;
  expectedType?: ExpectedTransactionType;
}

export const transactionAgentCases: TransactionAgentIntegrationCase[] =
  langfuseDatasetGeneratedCases.map(datasetCase => {
    const label = transactionAgentManualLabels[datasetCase.datasetItemId];

    if (!label) {
      throw new Error(
        `Missing manual label for dataset item ${datasetCase.datasetItemId}`
      );
    }

    return {
      name: label.name,
      expectedHasTransaction: label.expectedHasTransaction,
      userFullName: datasetCase.userFullName,
      userLocale: datasetCase.userLocale ?? "es",
      emailContent: datasetCase.emailContent,
      datasetItemId: datasetCase.datasetItemId,
      sourceObservationId: datasetCase.sourceObservationId,
      rationale: label.rationale,
      expectedAmount: label.expectedAmount,
      expectedCurrency: label.expectedCurrency,
      expectedType: label.expectedType,
    };
  });
