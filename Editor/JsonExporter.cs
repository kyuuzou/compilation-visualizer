using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEditor.Compilation;
using UnityEngine;

namespace Needle.CompilationVisualizer {
    
    [Serializable]
    internal class AssemblyExportData {

        [Serializable]
        internal class DataEntry {
            public string Name;
            public double Duration;
            public List<string> References = new List<string>();
            public List<string> Dependants = new List<string>();
        }
        
        public List<DataEntry> Entries = new List<DataEntry>();
    }
    
    internal class JsonExporter : IPostprocessBuildWithReport {
        
        public int callbackOrder => int.MaxValue;

        public void OnPostprocessBuild(BuildReport report) {
            // Terrible hack to give Unity enough time to export fullprofile.json
            Thread.Sleep(1000);
            ExportToJson();
        }

        internal static void ExportToJson() {
            ExportToJson(CompilationData.GetAll());
        }

        internal static void ExportToJson(CompilationData.IterativeCompilationData iterativeData) {
            AssemblyExportData exportData = new AssemblyExportData();

            foreach (CompilationData compilationData in iterativeData.iterations) {
                foreach (AssemblyCompilationData assemblyData in compilationData.compilationData) {
                    AssemblyExportData.DataEntry entry = new AssemblyExportData.DataEntry {
                        Name = Path.GetFileName(assemblyData.assembly),
                        Duration = (assemblyData.EndTime - assemblyData.StartTime).TotalSeconds
                    };

                    if (CompilationTimelineWindow.AssemblyDependencyDict.TryGetValue(assemblyData.assembly, out Assembly assembly)) {
                        foreach (Assembly reference in assembly.assemblyReferences) {
                            entry.References.Add(reference.name);
                        }
                    }

                    if (CompilationTimelineWindow.AssemblyDependantDict.TryGetValue(assemblyData.assembly, out List<Assembly> dependantList)) {
                        foreach (Assembly dependant in dependantList) {
                            entry.Dependants.Add(dependant.name);
                        }
                    }
                    
                    exportData.Entries.Add(entry);
                }
            }

            string jsonString = JsonUtility.ToJson(exportData, true);
            string path = "../Logs/compilation_timeline.json";
            File.WriteAllText(path, jsonString);
            
            Debug.Log($"Exported compilation timeline to {Path.GetFullPath(path)}: {jsonString}");
        }
    }
}