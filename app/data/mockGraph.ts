import type {
  Concept,
  QuizQuestion,
  Relationship,
  SkillCheckQuestion,
} from "../types/knowledgeGraph";

export const GRAPH_DATA_VERSION = "kg-v7-class9-rich-curriculum";

type SeedFields = Omit<Concept, "id" | "exploreContent">;
type Seed = SeedFields & { key: string };

function buildExploreContent(fields: SeedFields): string {
  const subjLens =
    fields.subject === "math"
      ? "equations or quantities"
      : fields.subject === "physics"
        ? "motion and energy pictures"
        : fields.subject === "chemistry"
          ? "particle and reaction stories"
          : fields.subject === "biology"
            ? "structures and ecosystems"
            : fields.subject === "english"
              ? "reading, writing, and grammar craft"
              : "maps, timelines, and civic ideas";
  return [
    `Big picture: ${fields.name} is the hinge in NCERT chapter “${fields.chapter}”—it plugs into homework word problems and labelled diagrams at Class ${fields.class}.`,
    `Explain like I’m fifteen: pretend ${fields.name.toLowerCase()} is a toolbox step you must tighten before tackling the harder ideas that reference it.`,
    `60-second recap: sketch the textbook definition once, jot one symbol or unit NCERT insists on here, then tie it to ${subjLens}.`,
    `Misconception watch: students confuse ${fields.name.toLowerCase()} with nearby ideas in the same unit—underline the glossary difference before practising.`,
    `DeepTutor roadmap: later quizzes can be synthesized by AI from this note bundle; incorrect answers reveal micro-gaps which then reprioritize the graph. Right now quizzes are templated locally and still drive mastery weights from accuracy, time, and hint use.`,
  ].join("\n\n");
}

/**
 * Class 9 only — many concepts grouped by chapter (topic).
 * Prerequisite edges stay within and lightly across topic bands per subject.
 */
const conceptSeeds: Seed[] = [
  // Math — Number Systems
  {
    key: "ma1",
    name: "Real Numbers Overview",
    description: "Irrational numbers sit on the number line beside rationals.",
    class: 9,
    subject: "math",
    chapter: "Number Systems",
  },
  {
    key: "ma2",
    name: "Rationalising Denominators",
    description: "Remove surds from denominators using conjugate pairs.",
    class: 9,
    subject: "math",
    chapter: "Number Systems",
  },
  {
    key: "ma3",
    name: "Laws of Exponents for Real Numbers",
    description: "Extend exponent rules to positive real bases and powers.",
    class: 9,
    subject: "math",
    chapter: "Number Systems",
  },
  // Math — Polynomials
  {
    key: "ma4",
    name: "Polynomial Terms and Degree",
    description: "Identify coefficients, degree, and standard form.",
    class: 9,
    subject: "math",
    chapter: "Polynomials",
  },
  {
    key: "ma5",
    name: "Zeros of a Polynomial",
    description: "Values of the variable that make the polynomial zero.",
    class: 9,
    subject: "math",
    chapter: "Polynomials",
  },
  {
    key: "ma6",
    name: "Factorisation of Polynomials",
    description: "Split polynomials into simpler multiplied factors.",
    class: 9,
    subject: "math",
    chapter: "Polynomials",
  },
  // Math — Linear equations in two variables
  {
    key: "ma7",
    name: "Linear Equation ax + by + c = 0",
    description: "Standard form and infinitely many (x, y) pairs on a line.",
    class: 9,
    subject: "math",
    chapter: "Linear Equations in Two Variables",
  },
  {
    key: "ma8",
    name: "Plotting Lines on a Graph",
    description: "Use intercepts and slope intuition to sketch ax + by + c = 0.",
    class: 9,
    subject: "math",
    chapter: "Linear Equations in Two Variables",
  },
  // Math — Coordinate geometry
  {
    key: "ma9",
    name: "Distance Formula",
    description: "Compute distance between two points in the Cartesian plane.",
    class: 9,
    subject: "math",
    chapter: "Coordinate Geometry",
  },
  {
    key: "ma10",
    name: "Section Formula",
    description: "Find coordinates dividing a segment in a given ratio.",
    class: 9,
    subject: "math",
    chapter: "Coordinate Geometry",
  },
  // Math — Triangles
  {
    key: "ma11",
    name: "Congruence Criteria",
    description: "SAS, ASA, SSS, RHS conditions for triangle congruence.",
    class: 9,
    subject: "math",
    chapter: "Triangles",
  },
  {
    key: "ma12",
    name: "Similarity of Triangles",
    description: "AA, SSS, SAS similarity and scale factors.",
    class: 9,
    subject: "math",
    chapter: "Triangles",
  },
  {
    key: "ma13",
    name: "Pythagoras Theorem",
    description: "Right triangle relation a² + b² = c² and simple applications.",
    class: 9,
    subject: "math",
    chapter: "Triangles",
  },
  // Math — Circles
  {
    key: "ma14",
    name: "Chords and Perpendicular from Centre",
    description: "Centre bisects a chord when the perpendicular meets it.",
    class: 9,
    subject: "math",
    chapter: "Circles",
  },
  {
    key: "ma15",
    name: "Angles in the Same Segment",
    description: "Angles subtended by the same arc at the circumference.",
    class: 9,
    subject: "math",
    chapter: "Circles",
  },
  // Math — Heron’s formula & surface areas
  {
    key: "ma16",
    name: "Heron’s Formula",
    description: "Area of a triangle from side lengths using semi-perimeter.",
    class: 9,
    subject: "math",
    chapter: "Heron’s Formula",
  },
  {
    key: "ma17",
    name: "Surface Area of Solids",
    description: "Cuboid, cylinder, cone, sphere formulas at intro level.",
    class: 9,
    subject: "math",
    chapter: "Surface Areas and Volumes",
  },
  {
    key: "ma18",
    name: "Volume of Solids",
    description: "Relate height, radius, and volume for common solids.",
    class: 9,
    subject: "math",
    chapter: "Surface Areas and Volumes",
  },
  // Math — Statistics & probability
  {
    key: "ma19",
    name: "Mean Median Mode",
    description: "Summarise grouped and ungrouped data sets.",
    class: 9,
    subject: "math",
    chapter: "Statistics",
  },
  {
    key: "ma20",
    name: "Presentation of Data",
    description: "Histograms and frequency polygons for continuous classes.",
    class: 9,
    subject: "math",
    chapter: "Statistics",
  },
  {
    key: "ma21",
    name: "Empirical Probability",
    description: "Estimate probability from observed frequencies.",
    class: 9,
    subject: "math",
    chapter: "Probability",
  },

  // Physics — Motion
  {
    key: "ph1",
    name: "Scalar and Vector Quantities",
    description: "Distinguish magnitude-only vs magnitude-with-direction quantities.",
    class: 9,
    subject: "physics",
    chapter: "Motion",
  },
  {
    key: "ph2",
    name: "Distance and Displacement",
    description: "Path length vs straight-line change of position.",
    class: 9,
    subject: "physics",
    chapter: "Motion",
  },
  {
    key: "ph3",
    name: "Speed Velocity and Acceleration",
    description: "Rates of change of distance and velocity with time.",
    class: 9,
    subject: "physics",
    chapter: "Motion",
  },
  {
    key: "ph4",
    name: "Equations of Motion",
    description: "v = u + at and related SUVAT-style relations for uniform acceleration.",
    class: 9,
    subject: "physics",
    chapter: "Motion",
  },
  // Physics — Force and laws of motion
  {
    key: "ph5",
    name: "Newton’s First Law",
    description: "Inertia and balanced forces keep motion uniform.",
    class: 9,
    subject: "physics",
    chapter: "Force and Laws of Motion",
  },
  {
    key: "ph6",
    name: "Newton’s Second Law",
    description: "F = ma links net force, mass, and acceleration.",
    class: 9,
    subject: "physics",
    chapter: "Force and Laws of Motion",
  },
  {
    key: "ph7",
    name: "Momentum and Third Law",
    description: "Action–reaction pairs and conservation intuition.",
    class: 9,
    subject: "physics",
    chapter: "Force and Laws of Motion",
  },
  // Physics — Work and energy
  {
    key: "ph8",
    name: "Work Done by a Force",
    description: "W = Fs cos θ for constant force along displacement.",
    class: 9,
    subject: "physics",
    chapter: "Work and Energy",
  },
  {
    key: "ph9",
    name: "Kinetic and Potential Energy",
    description: "Energy of motion vs stored energy in a field or configuration.",
    class: 9,
    subject: "physics",
    chapter: "Work and Energy",
  },
  {
    key: "ph10",
    name: "Law of Conservation of Energy",
    description: "Energy transforms among forms without net loss in an ideal system.",
    class: 9,
    subject: "physics",
    chapter: "Work and Energy",
  },
  // Physics — Gravitation & sound
  {
    key: "ph11",
    name: "Universal Gravitation",
    description: "Every mass attracts every other mass; weight vs mass.",
    class: 9,
    subject: "physics",
    chapter: "Gravitation",
  },
  {
    key: "ph12",
    name: "Pressure in Fluids",
    description: "P = hρg and buoyant force intuition.",
    class: 9,
    subject: "physics",
    chapter: "Gravitation",
  },
  {
    key: "ph13",
    name: "Propagation of Sound",
    description: "Compression and rarefaction in a medium.",
    class: 9,
    subject: "physics",
    chapter: "Sound",
  },
  {
    key: "ph14",
    name: "Reflection of Sound",
    description: "Echoes and reverberation in bounded spaces.",
    class: 9,
    subject: "physics",
    chapter: "Sound",
  },

  // Chemistry — Matter & atom
  {
    key: "ch1",
    name: "Pure Substances and Mixtures",
    description: "Homogeneous vs heterogeneous mixtures and solutions.",
    class: 9,
    subject: "chemistry",
    chapter: "Matter in Our Surroundings",
  },
  {
    key: "ch2",
    name: "Physical vs Chemical Change",
    description: "Identify changes that alter composition vs only state.",
    class: 9,
    subject: "chemistry",
    chapter: "Matter in Our Surroundings",
  },
  {
    key: "ch3",
    name: "Laws of Chemical Combination",
    description: "Law of conservation of mass and definite proportions.",
    class: 9,
    subject: "chemistry",
    chapter: "Atoms and Molecules",
  },
  {
    key: "ch4",
    name: "Mole Concept Intro",
    description: "Relate mass, amount of substance, and Avogadro’s number at basic level.",
    class: 9,
    subject: "chemistry",
    chapter: "Atoms and Molecules",
  },
  {
    key: "ch5",
    name: "Atomic Models",
    description: "Thomson, Rutherford, Bohr pictures of the atom.",
    class: 9,
    subject: "chemistry",
    chapter: "Structure of the Atom",
  },
  {
    key: "ch6",
    name: "Electronic Configuration",
    description: "Shells, subshells, and valence electrons in light atoms.",
    class: 9,
    subject: "chemistry",
    chapter: "Structure of the Atom",
  },
  {
    key: "ch7",
    name: "Periodic Trends",
    description: "Atomic size, metallic character, and valency across periods.",
    class: 9,
    subject: "chemistry",
    chapter: "Periodic Classification",
  },
  {
    key: "ch8",
    name: "Ionic and Covalent Bonding",
    description: "Transfer vs sharing of electrons between atoms.",
    class: 9,
    subject: "chemistry",
    chapter: "Chemical Bonding",
  },
  {
    key: "ch9",
    name: "Chemical Formulae of Compounds",
    description: "Write formulae using valency tables.",
    class: 9,
    subject: "chemistry",
    chapter: "Atoms and Molecules",
  },
  {
    key: "ch10",
    name: "Balancing Chemical Equations",
    description: "Conserve atoms while representing reactions.",
    class: 9,
    subject: "chemistry",
    chapter: "Chemical Reactions",
  },

  // Biology — Cell, tissues, diversity
  {
    key: "bi1",
    name: "Cell Membrane and Wall",
    description: "Plant vs animal boundary structures and roles.",
    class: 9,
    subject: "biology",
    chapter: "The Fundamental Unit of Life",
  },
  {
    key: "bi2",
    name: "Cell Organelles",
    description: "Nucleus, mitochondria, ER, Golgi, lysosomes at overview level.",
    class: 9,
    subject: "biology",
    chapter: "The Fundamental Unit of Life",
  },
  {
    key: "bi3",
    name: "Types of Tissues",
    description: "Epithelial, connective, muscular, nervous tissue roles.",
    class: 9,
    subject: "biology",
    chapter: "Tissues",
  },
  {
    key: "bi4",
    name: "Plant Tissues",
    description: "Meristematic vs permanent tissues in stems and roots.",
    class: 9,
    subject: "biology",
    chapter: "Tissues",
  },
  {
    key: "bi5",
    name: "Diversity in Living Organisms",
    description: "Basis of classification into kingdoms and phyla.",
    class: 9,
    subject: "biology",
    chapter: "Diversity in Living Organisms",
  },
  {
    key: "bi6",
    name: "Plant Kingdom Highlights",
    description: "Thallophytes to angiosperms at survey level.",
    class: 9,
    subject: "biology",
    chapter: "Diversity in Living Organisms",
  },
  {
    key: "bi7",
    name: "Natural Resources Overview",
    description: "Air, water, soil as life-supporting resources.",
    class: 9,
    subject: "biology",
    chapter: "Natural Resources",
  },
  {
    key: "bi8",
    name: "Improvement in Food Resources",
    description: "Crop variety improvement and animal husbandry basics.",
    class: 9,
    subject: "biology",
    chapter: "Improvement in Food Resources",
  },
  {
    key: "bi9",
    name: "Why Do We Fall Ill",
    description: "Infectious vs non-infectious disease and immunity intro.",
    class: 9,
    subject: "biology",
    chapter: "Why Do We Fall Ill",
  },
  {
    key: "bi10",
    name: "Health and Hygiene",
    description: "Public health measures and personal prevention.",
    class: 9,
    subject: "biology",
    chapter: "Why Do We Fall Ill",
  },

  // English — Grammar & writing
  {
    key: "en1",
    name: "Tenses: Present and Past",
    description: "Simple, continuous, and perfect forms in context.",
    class: 9,
    subject: "english",
    chapter: "Grammar — Tenses",
  },
  {
    key: "en2",
    name: "Modals for Advice and Obligation",
    description: "Use of must, should, may, might, can, could.",
    class: 9,
    subject: "english",
    chapter: "Grammar — Modals",
  },
  {
    key: "en3",
    name: "Reported Speech",
    description: "Backshift and reporting verbs for statements and questions.",
    class: 9,
    subject: "english",
    chapter: "Grammar — Reported Speech",
  },
  {
    key: "en4",
    name: "Clauses: Relative and Adverbial",
    description: "Who/which/that clauses and time/cause clauses.",
    class: 9,
    subject: "english",
    chapter: "Grammar — Clauses",
  },
  {
    key: "en5",
    name: "Determiners and Quantifiers",
    description: "Articles, some/any, much/many, few/little in agreement patterns.",
    class: 9,
    subject: "english",
    chapter: "Grammar — Determiners",
  },
  {
    key: "en6",
    name: "Formal Letter Writing",
    description: "Layout, tone, and purpose for official letters.",
    class: 9,
    subject: "english",
    chapter: "Writing Skills",
  },
  {
    key: "en7",
    name: "Message and Notice Writing",
    description: "Concise formats for school and community notices.",
    class: 9,
    subject: "english",
    chapter: "Writing Skills",
  },
  {
    key: "en8",
    name: "Reading for Inference",
    description: "Infer tone, motive, and unstated information from passages.",
    class: 9,
    subject: "english",
    chapter: "Reading Comprehension",
  },
  {
    key: "en9",
    name: "Literary Devices",
    description: "Simile, metaphor, alliteration, and imagery in poems.",
    class: 9,
    subject: "english",
    chapter: "Literature",
  },
  {
    key: "en10",
    name: "Character and Theme",
    description: "Track protagonist goals and central ideas in prose extracts.",
    class: 9,
    subject: "english",
    chapter: "Literature",
  },

  // Social science — History, Geography, Civics
  {
    key: "ss1",
    name: "French Revolution: Causes",
    description: "Political, social, and economic roots of 1789 unrest.",
    class: 9,
    subject: "social_science",
    chapter: "History — French Revolution",
  },
  {
    key: "ss2",
    name: "French Revolution: Events",
    description: "Storming of the Bastille to the Republic’s early years.",
    class: 9,
    subject: "social_science",
    chapter: "History — French Revolution",
  },
  {
    key: "ss3",
    name: "Socialism in Europe",
    description: "Workers’ movements and spread of socialist ideas.",
    class: 9,
    subject: "social_science",
    chapter: "History — Socialism",
  },
  {
    key: "ss4",
    name: "Forest Society and Colonialism",
    description: "How colonial policies reshaped forest use and livelihoods.",
    class: 9,
    subject: "social_science",
    chapter: "History — Forests",
  },
  {
    key: "ss5",
    name: "India: Size and Location",
    description: "Latitudinal extent, standard time, and neighbours.",
    class: 9,
    subject: "social_science",
    chapter: "Geography — India",
  },
  {
    key: "ss6",
    name: "Physical Features of India",
    description: "Himalayas, plains, plateaus, coastal belts overview.",
    class: 9,
    subject: "social_science",
    chapter: "Geography — India",
  },
  {
    key: "ss7",
    name: "Climate of India",
    description: "Monsoon mechanism and seasonal rainfall patterns.",
    class: 9,
    subject: "social_science",
    chapter: "Geography — Climate",
  },
  {
    key: "ss8",
    name: "Drainage Systems",
    description: "Himalayan and peninsular rivers and basins.",
    class: 9,
    subject: "social_science",
    chapter: "Geography — Drainage",
  },
  {
    key: "ss9",
    name: "What is Democracy?",
    description: "Features, arguments, and limits of democratic government.",
    class: 9,
    subject: "social_science",
    chapter: "Civics — Democracy",
  },
  {
    key: "ss10",
    name: "Constitutional Design",
    description: "Preamble, rights, and separation of powers at intro level.",
    class: 9,
    subject: "social_science",
    chapter: "Civics — Constitution",
  },
  {
    key: "ss11",
    name: "Electoral Politics",
    description: "Elections, parties, and participation in a democracy.",
    class: 9,
    subject: "social_science",
    chapter: "Civics — Elections",
  },
];

export const concepts: Concept[] = conceptSeeds.map((seed) => {
  const { key, ...fields } = seed;
  return {
    ...fields,
    id: key,
    exploreContent: buildExploreContent(fields),
  };
});

const relationshipSeeds: Array<[string, string]> = [
  // Math — topic chains + light bridges
  ["ma1", "ma2"],
  ["ma2", "ma3"],
  ["ma3", "ma4"],
  ["ma4", "ma5"],
  ["ma5", "ma6"],
  ["ma6", "ma7"],
  ["ma7", "ma8"],
  ["ma8", "ma9"],
  ["ma9", "ma10"],
  ["ma10", "ma11"],
  ["ma11", "ma12"],
  ["ma12", "ma13"],
  ["ma13", "ma14"],
  ["ma14", "ma15"],
  ["ma13", "ma16"],
  ["ma16", "ma17"],
  ["ma17", "ma18"],
  ["ma18", "ma19"],
  ["ma19", "ma20"],
  ["ma20", "ma21"],
  // Physics
  ["ph1", "ph2"],
  ["ph2", "ph3"],
  ["ph3", "ph4"],
  ["ph4", "ph5"],
  ["ph5", "ph6"],
  ["ph6", "ph7"],
  ["ph7", "ph8"],
  ["ph8", "ph9"],
  ["ph9", "ph10"],
  ["ph10", "ph11"],
  ["ph11", "ph12"],
  ["ph12", "ph13"],
  ["ph13", "ph14"],
  // Chemistry
  ["ch1", "ch2"],
  ["ch2", "ch3"],
  ["ch3", "ch4"],
  ["ch4", "ch9"],
  ["ch5", "ch6"],
  ["ch6", "ch7"],
  ["ch7", "ch8"],
  ["ch8", "ch10"],
  ["ch9", "ch10"],
  // Biology
  ["bi1", "bi2"],
  ["bi2", "bi3"],
  ["bi3", "bi4"],
  ["bi4", "bi5"],
  ["bi5", "bi6"],
  ["bi6", "bi7"],
  ["bi7", "bi8"],
  ["bi8", "bi9"],
  ["bi9", "bi10"],
  // English
  ["en1", "en2"],
  ["en2", "en3"],
  ["en3", "en4"],
  ["en4", "en5"],
  ["en5", "en6"],
  ["en6", "en7"],
  ["en7", "en8"],
  ["en8", "en9"],
  ["en9", "en10"],
  // Social science
  ["ss1", "ss2"],
  ["ss2", "ss3"],
  ["ss3", "ss4"],
  ["ss4", "ss5"],
  ["ss5", "ss6"],
  ["ss6", "ss7"],
  ["ss7", "ss8"],
  ["ss8", "ss9"],
  ["ss9", "ss10"],
  ["ss10", "ss11"],
];

const class9ConceptIds = new Set(concepts.map((c) => c.id));

export const relationships: Relationship[] = relationshipSeeds
  .map(([source, target]) => ({ source, target }))
  .filter(
    (edge) => class9ConceptIds.has(edge.source) && class9ConceptIds.has(edge.target),
  );

export const skillCheckQuestions: SkillCheckQuestion[] = concepts
  .filter((concept) => concept.class === 9)
  .slice(0, 48)
  .map((concept, index) => ({
    id: `sq${index + 1}`,
    conceptId: concept.id,
    prompt: `How confident are you with ${concept.name}?`,
    class: concept.class,
    subject: concept.subject,
  }));

function buildConceptQuiz(concept: Concept, index: number): QuizQuestion[] {
  return [
    {
      id: `q-${concept.id}-1`,
      conceptId: concept.id,
      prompt: `Which statement best matches "${concept.name}"?`,
      options: [
        concept.description,
        `It is unrelated to ${concept.subject}`,
        "It can only be used in class 1",
        "It has no practical use",
      ],
      correctAnswer: concept.description,
      explanation: concept.description,
      hint: `Focus on the definition of ${concept.name}.`,
    },
    {
      id: `q-${concept.id}-2`,
      conceptId: concept.id,
      prompt: `${concept.name} belongs to which chapter?`,
      options: [
        concept.chapter,
        "Random Chapter A",
        "Random Chapter B",
        "General Knowledge",
      ],
      correctAnswer: concept.chapter,
      explanation: `${concept.name} is covered in ${concept.chapter}.`,
      hint: "Recall the chapter mapping from the concept panel.",
    },
    {
      id: `q-${concept.id}-3`,
      conceptId: concept.id,
      prompt: `This concept is primarily taught in which class level first?`,
      options: [
        `Class ${concept.class}`,
        `Class ${Math.max(6, concept.class - 1)}`,
        `Class ${Math.min(10, concept.class + 1)}`,
        "College level only",
      ],
      correctAnswer: `Class ${concept.class}`,
      explanation: `${concept.name} enters learning track at Class ${concept.class}.`,
      hint: "See the concept metadata (class/subject/chapter).",
    },
    {
      id: `q-${concept.id}-4`,
      conceptId: concept.id,
      prompt: `Diagnostic: Which earlier concept can block progress in "${concept.name}" if weak?`,
      options: [
        "Its prerequisite concepts",
        "Only unrelated topics",
        "No concept affects it",
        "Only language skills",
      ],
      correctAnswer: "Its prerequisite concepts",
      explanation: "Dependent concepts rely on prerequisites in the graph.",
      hint: "Look at incoming graph edges.",
    },
    {
      id: `q-${concept.id}-5`,
      conceptId: concept.id,
      prompt: `Practice set ${index + 1}: Mastery should improve most when you`,
      options: [
        "Answer correctly with fewer hints",
        "Skip all questions",
        "Guess randomly",
        "Avoid reviewing prerequisites",
      ],
      correctAnswer: "Answer correctly with fewer hints",
      explanation: "Accuracy and low hint usage drive mastery growth.",
      hint: "Think about the scoring formula.",
    },
  ];
}

export const quizQuestions: QuizQuestion[] = concepts.flatMap(buildConceptQuiz);
