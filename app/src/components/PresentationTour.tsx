/**
 * Optional, deliberately URL-gated guided sales presentation.
 * The normal retail demo renders no extra controls or banners.
 * All shown metrics are illustrative demo data, never real visitors or sales.
 */
type Props = {
  step: number;
  auto: boolean;
  onStart: () => void;
  onToggleAuto: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onRestart: () => void;
  onExit: () => void;
};

const chapters = [
  {
    eyebrow: '01 · DISCOVERY',
    title: 'Turn a screen into a storefront.',
    description: 'Four original commercials attract attention while the fridge stays closed. The customer can browse the campaigns and their formats.',
  },
  {
    eyebrow: '02 · AUDIENCE SIGNAL',
    title: 'The experience responds.',
    description: 'A simulated visitor moves the demo into Audience Mode. Physical detection requires the actual camera: no real visitor is being measured here.',
  },
  {
    eyebrow: '03 · SMART FRIDGE',
    title: 'Open the intelligent fridge.',
    description: 'The refrigerated chamber reveals all four complete cans. Product lighting, cold vapor, and the original interactive shelves remain unchanged.',
  },
  {
    eyebrow: '04 · PRODUCT SPOTLIGHT',
    title: 'Every drink has its story.',
    description: 'Selecting BLOOM highlights its campaign, price, flavor, and product details. The other three drinks are still available to explore.',
  },
  {
    eyebrow: '05 · SMART BASKET',
    title: 'Interest becomes intent.',
    description: 'One BLOOM drink enters the simulated basket. Prices and quantities update locally, without any payment processor.',
  },
  {
    eyebrow: '06 · DEMO CHECKOUT',
    title: 'A simulated conversion.',
    description: 'A $3.99 demonstration checkout is reflected in the local metrics. No card was charged and no real stock was sold.',
  },
  {
    eyebrow: '07 · REWARDS',
    title: 'Bring shoppers back.',
    description: 'The separate Rewards experience demonstrates QR-based enrollment and a first-drink offer. Open it in a new tab without interrupting the tour.',
  },
  {
    eyebrow: '08 · RETAIL INTELLIGENCE',
    title: 'See the business value.',
    description: 'Review illustrative session counts, product selections, simulated revenue, inventory, and gesture analytics. These are local demonstration figures, not real traffic.',
  },
] as const;

export function PresentationTour({step,auto,onStart,onToggleAuto,onPrevious,onNext,onRestart,onExit}:Props){
  const started=step>=0;
  const end=step===chapters.length-1;
  const chapter=chapters[Math.max(0,step)];
  return <section className="presentation-tour" aria-label="Smart Retail AI guided presentation">
    <header className="presentation-tour-header">
      <div><span className="presentation-tour-kicker">SMART RETAIL AI · PITCH MODE</span><strong>{started?'Guided presentation':'Presentation ready'}</strong></div>
      <button className="presentation-tour-exit" type="button" onClick={onExit} aria-label="Exit presentation mode">✕</button>
    </header>
    {!started
      ? <div className="presentation-tour-body">
          <h3>A complete retail story in ~80 seconds.</h3>
          <p>Watch the advertising, visitor simulation, cold fridge, product discovery, basket, checkout, Rewards, and analytics unfold in order.</p>
          <p className="presentation-tour-disclaimer">This presentation uses isolated, fictional data. Camera access and real payments are never triggered.</p>
          <button className="presentation-tour-primary" onClick={onStart} type="button">▶ Start guided tour</button>
        </div>
      : <div className="presentation-tour-body">
          <div className="presentation-tour-progress" role="progressbar" aria-label="Presentation progress" aria-valuenow={step+1} aria-valuemin={0} aria-valuemax={chapters.length}>
            {chapters.map((_,i)=><span key={i} className={i<=step?'done':''}/>)}
          </div>
          <span className="presentation-tour-step">{chapter.eyebrow} <b>{step+1} / {chapters.length}</b></span>
          <h3>{chapter.title}</h3>
          <p>{chapter.description}</p>
          {step===6&&<a className="presentation-tour-rewards" href="/rewards" target="_blank" rel="noopener noreferrer">Explore QR Rewards ↗</a>}
          <div className="presentation-tour-buttons">
            <button type="button" onClick={onPrevious} disabled={step===0} aria-label="Previous tour step">←</button>
            {end
              ? <button type="button" onClick={onRestart}>↺ Replay tour</button>
              : <button type="button" onClick={onToggleAuto}>{auto?'Ⅱ Pause':'▶ Resume'}</button>
            }
            <button type="button" onClick={onNext} disabled={end} aria-label="Next tour step">Next →</button>
          </div>
          <p className="presentation-tour-disclaimer">DEMO ONLY · No camera, payment, or real customer analytics.</p>
        </div>}
  </section>;
}
