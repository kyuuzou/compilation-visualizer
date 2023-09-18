using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using UnityEditor;
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
            public double DurationInSeconds;
            public long StartTimeInTicks;
            public List<string> References = new List<string>();
            public List<string> Dependants = new List<string>();
        }
        
        public List<DataEntry> Entries = new List<DataEntry>();
        public double TotalDurationInSeconds;
    }
    
    internal class HtmlExporter : IPostprocessBuildWithReport {
        
        public int callbackOrder => int.MaxValue;

        private static string jsPrefix = "const compilationData = ";
        private static string jsSuffix = ";";
        
        public void OnPostprocessBuild(BuildReport report) {
            // Terrible hack to give Unity enough time to export fullprofile.json
            Thread.Sleep(1000);
            ExportToHtml();
        }

        internal static void ExportToHtml() {
            ExportToHtml(CompilationData.GetAll());
        }

        internal static void ExportToHtml(CompilationData.IterativeCompilationData iterativeData) {
            string sourceFolder = Path.GetFullPath("Packages/com.needle.compilation-visualizer/Web/");
            string destinationFolder = Path.GetFullPath("../Logs/Web/");
            
            CopyFolder(sourceFolder, destinationFolder);

            AssemblyExportData exportData = new AssemblyExportData();
            TimeSpan compilationTimeSpan = iterativeData.iterations.Last().CompilationFinished - iterativeData.iterations.First().CompilationStarted;
            exportData.TotalDurationInSeconds = compilationTimeSpan.TotalSeconds;
            
            foreach (CompilationData compilationData in iterativeData.iterations) {
                foreach (AssemblyCompilationData assemblyData in compilationData.compilationData) {
                    AssemblyExportData.DataEntry entry = new AssemblyExportData.DataEntry {
                        Name = Path.GetFileName(assemblyData.assembly),
                        DurationInSeconds = (assemblyData.EndTime - assemblyData.StartTime).TotalSeconds,
                        StartTimeInTicks = assemblyData.StartTime.Ticks
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

            string javascript = JsonUtility.ToJson(exportData, true);
            javascript = $"{jsPrefix}{javascript}{jsSuffix}";
            
            string path = Path.Combine(destinationFolder, "compilation_timeline.js");
            File.WriteAllText(path, javascript);
            
            Debug.Log($"Exported compilation timeline to {path}: {javascript}");
        }
        
        private static void CopyFolder(string sourcePath, string destinationPath) {
            try {
                if (!Directory.Exists(sourcePath)) {
                    Console.WriteLine("Source directory does not exist.");
                    return;
                }

                if (!Directory.Exists(destinationPath)) {
                    Directory.CreateDirectory(destinationPath);
                }

                string[] files = Directory.GetFiles(sourcePath);

                foreach (string file in files) {
                    string fileName = Path.GetFileName(file);
                    string destFile = Path.Combine(destinationPath, fileName);
                    File.Copy(file, destFile, true);
                }

                string[] subdirectories = Directory.GetDirectories(sourcePath);

                foreach (string subdirectory in subdirectories) {
                    string folderName = Path.GetFileName(subdirectory);
                    string destDirectory = Path.Combine(destinationPath, folderName);
                    CopyFolder(subdirectory, destDirectory);
                }

                Console.WriteLine("Folder copied successfully.");
            } catch (Exception e) {
                Console.WriteLine($"An error occurred: {e.Message}");
            }
        }
    }
}