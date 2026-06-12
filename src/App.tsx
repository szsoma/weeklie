import WeekHeader from './components/WeekHeader'
import WeekGrid from './components/WeekGrid'
import BacklogPanel from './components/BacklogPanel'

export default function App() {
  return (
    <div className="h-screen flex flex-col">
      <WeekHeader />
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 min-h-0">
          <WeekGrid />
        </div>
        <BacklogPanel />
      </div>
    </div>
  )
}
