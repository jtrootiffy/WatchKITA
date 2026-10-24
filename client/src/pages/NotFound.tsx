import { ButtonLink } from '../components/ui/Button'

export default function NotFound() {
  return (
    <div className="shell flex min-h-[70vh] flex-col justify-center py-32">
      <p className="eyebrow">Error 404</p>
      <h1 className="mt-4 font-serif text-4xl leading-tight text-white sm:text-5xl">
        This page is out of frame.
      </h1>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">
        The address you followed does not match a page in WatchKITA. Head back to the catalog to
        keep browsing.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink to="/">Back to home</ButtonLink>
        <ButtonLink to="/discover" variant="secondary">
          Browse the catalog
        </ButtonLink>
      </div>
    </div>
  )
}
