from pathlib import Path
import subprocess,tempfile,json,re
w=Path(__file__).resolve().parents[1]
n=w.parent/'PelvicFloor'/'Pelvic Floor'
s=(n/'Core/Tracking/MensPelvicHealth.swift').read_text();mens=s[s.index('nonisolated struct MensPelvicMetric'):s.index('nonisolated struct MensPelvicHealthEntry')]
s=(n/'Core/Cycle/CycleContext.swift').read_text();cycle=s[s.index('struct CycleMetricDefinition'):s.index('// MARK: - Local + iCloud store')]
f=(n/'Core/GoalFocus.swift').read_text();names=dict(re.findall(r'static let (\w+) = Self\(rawValue: "([^"]+)"\)',f))
goals=['intimacy','bladderLeaks','pelvicPain','postpartum','pregnancyPrep','diastasisRecti','coreStrength','fitness','stability','prolapse','prostateRecovery','bowelControl']
stub='import Foundation\nenum GoalID: String, CaseIterable { case '+', '.join(goals)+' }\nstruct GoalFocusID: Equatable { let rawValue: String\n'+''.join(f'static let {key} = Self(rawValue: "{value}")\n' for key,value in names.items())+'}\nstruct Focus { let id: GoalFocusID }\n@MainActor enum GoalFocusStore { static var focus: Focus?; static func selected(for goal: GoalID) -> Focus? { focus } }\n'
main='''
func encodeMetric(_ metric: MensPelvicMetric) -> [String: Any] { ["id":metric.id,"title":metric.title,"question":metric.question,"low":metric.lowLabel,"high":metric.highLabel,"higherIsBetter":metric.higherIsBetter] }
var mens: [String: Any] = [:]
for goal in GoalID.allCases {
 GoalFocusStore.focus = nil
 let p = MensPelvicHealthPlan.current(for: goal)
 mens[goal.rawValue] = ["title":p.title,"subtitle":p.subtitle,"metrics":p.metrics.map(encodeMetric)]
}
var focuses: [String: Any] = [:]
for id in [GoalFocusID.maleErectionQuality,.maleEjaculationControl,.malePelvicTension,.maleSexualConfidence] {
 GoalFocusStore.focus = Focus(id:id)
 let p = MensPelvicHealthPlan.current(for:.intimacy)
 focuses[id.rawValue] = ["title":p.title,"subtitle":p.subtitle,"metrics":p.metrics.map(encodeMetric)]
}
var cycle: [String: Any] = [:]
for goal in GoalID.allCases {
 let p=CycleContextPlan.current(for:goal)
 cycle[goal.rawValue] = ["title":p.title,"subtitle":p.subtitle,"metrics":p.metrics.map { ["id":$0.id,"title":$0.title,"question":$0.question,"low":$0.lowLabel,"high":$0.highLabel,"higherIsBetter":$0.higherIsBetter] }]
}
let data=try JSONSerialization.data(withJSONObject:["mens":mens,"mensFocus":focuses,"cycle":cycle],options:[.sortedKeys])
FileHandle.standardOutput.write(data)
'''
with tempfile.TemporaryDirectory() as d:
 p=Path(d);(p/'main.swift').write_text((stub+mens+cycle+main).replace('@MainActor', ''))
 subprocess.run(['swiftc',str(p/'main.swift'),'-o',str(p/'export')],check=True)
 data=json.loads(subprocess.check_output([str(p/'export')]))
 (w/'lib/trackerCatalogData.js').write_text('// Generated directly from native MensPelvicHealthPlan and CycleContextPlan.\nexport const TRACKER_CATALOG = '+json.dumps(data,ensure_ascii=False,indent=2)+';\n')
print('Exported native tracker metric catalogs.')
