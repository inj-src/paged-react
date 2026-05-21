export function NestedPrescriptionLayout() {
  const diagnosisPoints = [
    "Per urethral discharge",
    "Ircy Papular irash",
    "HTN(-ve)",
    "DM (-ve)",
    "VDRL (Qualitative/Quantitative)",
    "TPHA (Qualitative/Quantitative)",
    "Anti HIV (1&2)",
    "HBsAg (Screening)",
    "Gonococcal Urethritis",
    "Scabies",
  ];

  const baseTreatmentSteps = [
    {
      name: "Inj. Rofecin 2 gm/vial",
      dose: "1 ampoule x 1 time",
      duration: "5 days",
      note: "Slow deep IM, for both partners.",
    },
    {
      name: "Cap. Doxy-A 100 mg",
      dose: "1 + 0 + 1",
      duration: "14 days",
      note: "After meals from day 7.",
    },
    {
      name: "Pernix Lotion",
      dose: "Whole bottle",
      duration: "1 night",
      note: "Apply neck down, wash after 8-12 hours.",
    },
    {
      name: "The Remidist Ketonaseal Shampoo",
      dose: "Topical",
      duration: "1 month",
      note: "Use during bath and leave for five minutes before rinse.",
    },
    {
      name: "Facid HC 2% / 1% Cream",
      dose: "Topical",
      duration: "1 month",
      note: "Apply twice daily to the affected region with a deliberatelyLongUnbrokenInstructionTokenThatNeedsToBreakAcrossThePageIfSpaceRunsOut.",
    },
  ];

  const treatmentSteps = Array.from({ length: 7 }, (_, cycleIndex) =>
    baseTreatmentSteps.map((step, stepIndex) => {
      const nextStep = {
        ...step,
        key: `${cycleIndex + 1}-${stepIndex + 1}-${step.name}`,
      };

      if (cycleIndex > 0) {
        nextStep.name = `${step.name} Follow-up Cycle ${cycleIndex + 1}`;
        nextStep.note = `${step.note} Reassess tolerance, hydration status, symptom regression, and partner treatment adherence at the next review.`;
      }

      return nextStep;
    }),
  ).flat();

  const adviceItems = Array.from({ length: 8 }, (_, index) => {
    const adviceLibrary = [
      "Do not substitute medicines without review.",
      "Contact the clinic before follow-up if symptoms change materially.",
      "Maintain the written dosing schedule and bring the sheet to the next visit.",
      "Avoid missed doses during the first two weeks of treatment.",
      "Use barrier protection until both partners complete the full regimen.",
      "Report new rash, fever, or severe gastric intolerance immediately.",
      "Increase oral fluids and avoid self-started additional antibiotics.",
      "Return with investigation reports and symptom notes for reassessment.",
    ];

    return adviceLibrary[index % adviceLibrary.length];
  });

  return (
    <section className="flex flex-1 gap-4" style={{ marginTop: "0.25in" }}>
      <ul className="flex flex-col gap-[4pt] min-w-0" style={{ width: "2in" }}>
        <li className="min-h-[1in]">
          <p className="font-semibold text-[11pt] text-gray-800 leading-[15pt]">
            C/C
          </p>
          <ul className="mt-0 mb-[6pt] pl-[24pt] w-full list-disc">
            {diagnosisPoints.slice(0, 2).map((point) => (
              <li key={point} className="font-medium text-[9.75pt]">
                {point}
              </li>
            ))}
          </ul>
        </li>
        <li className="min-h-[1in]">
          <p className="font-semibold text-[11pt] text-gray-800 leading-[15pt]">
            Findings
          </p>
          <ul className="mt-0 mb-[6pt] pl-[24pt] w-full list-disc">
            {diagnosisPoints.slice(2, 4).map((point) => (
              <li key={point} className="font-medium text-[9.75pt]">
                {point}
              </li>
            ))}
          </ul>
        </li>
        <li className="min-h-[1in]">
          <p className="font-semibold text-[11pt] text-gray-800 leading-[15pt]">
            Investigation
          </p>
          <ul className="mt-0 mb-[6pt] pl-[24pt] w-full list-disc">
            {diagnosisPoints.slice(4, 8).map((point) => (
              <li key={point} className="font-medium text-[9.75pt]">
                {point}
              </li>
            ))}
            {diagnosisPoints.slice(4, 8).map((point) => (
              <li key={point} className="font-medium text-[9.75pt]">
                {point}
              </li>
            ))}{" "}
            {diagnosisPoints.slice(4, 8).map((point) => (
              <li key={point} className="font-medium text-[9.75pt]">
                {point}
              </li>
            ))}{" "}
            {diagnosisPoints.slice(4, 8).map((point) => (
              <li key={point} className="font-medium text-[9.75pt]">
                {point}
              </li>
            ))}{" "}
            {diagnosisPoints.slice(4, 8).map((point) => (
              <li key={point} className="font-medium text-[9.75pt]">
                {point}
              </li>
            ))}{" "}
            {diagnosisPoints.slice(4, 8).map((point) => (
              <li key={point} className="font-medium text-[9.75pt]">
                {point}
              </li>
            ))}
          </ul>
        </li>
        <li className="min-h-[1in]">
          <p className="font-semibold text-[11pt] text-gray-800 leading-[15pt]">
            Diagnosis
          </p>
          <ul className="mt-0 mb-[6pt] pl-[24pt] w-full list-disc">
            {diagnosisPoints.slice(8).map((point) => (
              <li key={point} className="font-medium text-[9.75pt]">
                {point}
              </li>
            ))}
            {diagnosisPoints.slice(0, 4).map((point, index) => (
              <li
                key={`${point}-repeat-${index}`}
                className="font-medium text-[9.75pt]"
              >
                Review note: {point}
              </li>
            ))}
          </ul>
        </li>
      </ul>

      <ul
        className="flex flex-col gap-[4pt] min-w-0"
        style={{ marginLeft: "4pt", marginTop: "0.5in", width: "5.77in" }}
      >
        <li className="min-h-[1in]">
          <ol className="space-y-[10pt] mt-0 pt-[15pt] pl-[15pt] w-full list-decimal">
            {treatmentSteps.map((step) => (
              <li
                key={step.key}
                className="w-full text-[8.75pt] leading-[10.5pt]"
              >
                <div className="mb-[2pt] pr-[18pt] text-[10pt]">
                  {step.name}
                </div>
                <div className="items-start gap-x-[6pt] grid grid-cols-[2fr_1fr_3fr] pr-[26pt] w-full">
                  <div className="min-w-0">{step.dose}</div>
                  <div className="min-w-0 text-center">{step.duration}</div>
                  <div className="min-w-0 text-left break-all">{step.note}</div>
                </div>
              </li>
            ))}
          </ol>
        </li>
        <li className="min-h-[1in]">
          <p className="font-semibold text-[11pt] text-gray-800 leading-[15pt]">
            Advices
          </p>
          <ol className="mt-0 mb-[6pt] pl-[24pt] w-full list-decimal">
            {adviceItems.map((item, index) => (
              <li key={`${index + 1}-${item}`} className="text-[8.75pt]">
                {item}
              </li>
            ))}
          </ol>
        </li>
      </ul>
    </section>
  );
}
