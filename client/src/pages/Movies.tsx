import CatalogBrowser from '../components/CatalogBrowser'

export default function Movies() {
  return (
    <CatalogBrowser
      mode="movies"
      title="Movies"
      description="Browse feature films by genre, release year, and availability in your region. Sorted from the full Watchmode catalog."
    />
  )
}
