export type QuestionKind = 'vocab' | 'main-idea' | 'inference';

export interface Question {
  kind: QuestionKind;
  prompt: string;
  choices: string[];
  correctIndex: number;
  /** Shown after the player answers, whether right or wrong. */
  explanation: string;
}

export interface Passage {
  id: string;
  name: string;
  years: string;
  /** Passage text with the vocabulary word wrapped in `<vocab>...</vocab>`. */
  text: string;
  vocabWord: string;
  vocabDefinition: string;
  funFact: string;
  questions: Question[];
  /** Where the player (a Chronicle time guide) lands, shown before the passage. */
  arrival: string;
  /** Shown after a correct answer: the moment's memory is anchored in the record. */
  memorySecured: string;
  /** Shown after a wrong or missed answer: the record blurs, no real history changes. */
  memoryFlicker: string;
}
