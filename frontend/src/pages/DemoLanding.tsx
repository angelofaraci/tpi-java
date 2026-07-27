import { CharacterCard } from '../components/CharacterCard'
import { CampaignRailCard } from '../components/CampaignRailCard'
import { MetricTile } from '../components/MetricTile'
import { DEMO_CAMPAIGN, DEMO_CHARACTERS, DEMO_LEVELS } from './demoLandingData'

interface DemoLandingProps {
  onLoginRequest: () => void
}

export function DemoLanding({ onLoginRequest }: DemoLandingProps) {
  return (
    <div className="bg-home-ink-900 text-home-text" style={{ fontFamily: 'var(--font-home-display)' }}>
      <header className="flex h-[58px] items-center justify-between bg-home-ink-800 border-b border-home-line px-[26px]">
        <div className="flex items-center gap-[10px]">
          <div
            aria-hidden="true"
            className="h-[20px] w-[20px] rotate-45 rounded-[3px] border-[1.5px] border-home-blue-500"
          />
          <span
            className="font-home-display text-[12.5px] font-bold uppercase text-home-text-strong"
            style={{ letterSpacing: '.16em' }}
          >
            D&D MANAGER
          </span>
        </div>

        <button
          type="button"
          onClick={onLoginRequest}
          className="h-[36px] rounded-home-md bg-home-blue-600 px-[16px] font-home-display text-[12.5px] font-semibold text-white shadow-[0_6px_18px_-6px_rgba(37,99,235,.8)]"
        >
          Log In / Sign Up
        </button>
      </header>

      <div className="border-b border-home-line bg-[radial-gradient(900px_240px_at_12%_-40%,rgba(59,130,246,.14),transparent_70%)] p-[24px_26px_20px]">
        <div className="mb-[20px] flex items-end justify-between gap-[24px]">
          <div>
            <div className="mb-[8px] font-home-mono text-[10px] tracking-[.18em] text-[#5b6deb]">
              A LIVE LOOK INSIDE
            </div>
            <h1 className="font-home-display text-[27px] font-semibold leading-[1.15] tracking-[-.01em] text-home-text-strong">
              See what your table looks like
            </h1>
            <p className="mt-[6px] text-[13px] text-home-muted">
              A real campaign and its heroes, rendered exactly as you&apos;ll see your own. Log in or sign up to
              start yours.
            </p>
          </div>
        </div>

        <div data-testid="demo-metrics-grid" className="grid grid-cols-2 gap-[10px] md:grid-cols-4">
          <MetricTile value={1} label="CAMPAIGNS" />
          <MetricTile value={DEMO_CHARACTERS.length} label="CHARACTERS" />
          <MetricTile value={1} label="AS DUNGEON MASTER" valueClassName="text-home-blue-400" />
          <MetricTile value={4} label="PLAYERS AT THIS TABLE" />
        </div>
      </div>

      <div data-testid="demo-body-grid" className="grid grid-cols-1 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_368px]">
        <div className="order-2 p-[22px_26px_28px] lg:order-none">
          <div className="mb-[16px] flex items-center justify-between">
            <div className="flex items-center gap-[8px]">
              <h2 className="font-home-display text-[13px] font-semibold uppercase tracking-[.13em] text-home-text-strong">
                Characters
              </h2>
              <span className="rounded-full bg-home-chip px-[7px] py-[2px] font-home-mono text-[10.5px] font-semibold text-[#8fb2ec]">
                {DEMO_CHARACTERS.length}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-[12px]">
            {DEMO_CHARACTERS.map((character) => (
              <CharacterCard
                key={character.id}
                character={character}
                campaignName={DEMO_CAMPAIGN.name}
                isDungeonMaster
                levelsByCharacterId={DEMO_LEVELS}
                interactive={false}
              />
            ))}
          </div>
        </div>

        <div className="order-1 border-l border-home-line bg-home-ink-850 p-[22px_24px_28px] lg:order-none">
          <div className="mb-[16px] flex items-center justify-between">
            <div className="flex items-center gap-[8px]">
              <h2 className="font-home-display text-[13px] font-semibold uppercase tracking-[.13em] text-home-text-strong">
                Campaigns
              </h2>
              <span className="rounded-full bg-home-chip px-[7px] py-[2px] font-home-mono text-[10.5px] font-semibold text-[#8fb2ec]">
                1
              </span>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:overflow-x-auto lg:flex-col">
            <div className="md:min-w-[280px] lg:min-w-0">
              <CampaignRailCard campaign={DEMO_CAMPAIGN} featured interactive={false} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
