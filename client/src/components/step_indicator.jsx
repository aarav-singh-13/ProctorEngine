const STEPS = ['Roll & name', 'Face verify', 'Exam'];

export default function StepIndicator({ currentStep }) {
  return (
    <div className="step-indicator">
      {STEPS.map((label, index) => {
        const stepNum = index + 1;
        let className = 'step';
        if (stepNum < currentStep) className += ' done';
        else if (stepNum === currentStep) className += ' active';

        return (
          <div key={label} className={className}>
            {label}
          </div>
        );
      })}
    </div>
  );
}
