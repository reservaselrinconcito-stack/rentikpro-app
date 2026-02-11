
import React from 'react';
import { PromptBuilder } from '../components/PromptBuilder';

export const PromptBuilderPage: React.FC = () => {
  return (
    <div className="h-full">
      <PromptBuilder mode="PAGE" />
    </div>
  );
};
