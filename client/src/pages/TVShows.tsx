import CatalogBrowser from '../components/CatalogBrowser'

export default function TVShows() {
  return (
    <CatalogBrowser
      mode="tv"
      title="TV Shows"
      description="Series, miniseries, and specials from the Watchmode catalog, filtered by genre, year, and region availability."
    />
  )
}
