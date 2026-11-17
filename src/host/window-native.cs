// Short-lived focus helper. No installed native dependency or persistent process.
using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Collections.Generic;
public static class NotesWindow {
 [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
 [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
 [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr h,int n);
 [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h,out uint pid);
 [DllImport("kernel32.dll")] static extern IntPtr OpenProcess(uint access,bool inherit,int pid);
 [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr h);
 [DllImport("ntdll.dll")] static extern int NtQueryInformationProcess(IntPtr h,int kind,IntPtr data,int size,out int needed);
 [DllImport("shell32.dll",CharSet=CharSet.Unicode)] static extern IntPtr CommandLineToArgvW(string line,out int count);
 [DllImport("kernel32.dll")] static extern IntPtr LocalFree(IntPtr memory);
 [StructLayout(LayoutKind.Sequential)] struct UnicodeString { public ushort Length,MaximumLength; public IntPtr Buffer; }
 // Windows 10/11 ProcessCommandLineInformation; missing/denied queries fail closed.
 // This only reads the target process, avoiding WMI service/network waits.
 public static string CommandLine(int pid) {
  IntPtr h=OpenProcess(0x1000,false,pid);if(h==IntPtr.Zero)return null;
  IntPtr data=IntPtr.Zero;
  try {
   int needed;NtQueryInformationProcess(h,60,IntPtr.Zero,0,out needed);
   if(needed<Marshal.SizeOf(typeof(UnicodeString))||needed>131072)return null;
   int capacity=needed;data=Marshal.AllocHGlobal(capacity);
   if(NtQueryInformationProcess(h,60,data,capacity,out needed)<0)return null;
   var value=(UnicodeString)Marshal.PtrToStructure(data,typeof(UnicodeString));
   long offset=value.Buffer.ToInt64()-data.ToInt64();
   if(offset<0||offset+value.Length>capacity||(value.Length&1)!=0)return null;
   return Marshal.PtrToStringUni(value.Buffer,value.Length/2);
  }catch{return null;}finally{if(data!=IntPtr.Zero)Marshal.FreeHGlobal(data);CloseHandle(h);}
 }
 public static bool Matches(string line,string profile,string url) {
  if(String.IsNullOrEmpty(line)||String.IsNullOrEmpty(profile)||String.IsNullOrEmpty(url))return false;
  int count;IntPtr args=CommandLineToArgvW(line,out count);if(args==IntPtr.Zero)return false;
  string actualProfile=null,actualUrl=null;
  try {
   for(int i=1;i<count;i++) {
    string arg=Marshal.PtrToStringUni(Marshal.ReadIntPtr(args,i*IntPtr.Size));
    if(arg.StartsWith("--type=",StringComparison.Ordinal))return false;
    if(arg.StartsWith("--user-data-dir=",StringComparison.Ordinal)){if(actualProfile!=null)return false;actualProfile=arg.Substring(16);}
    if(arg.StartsWith("--app=",StringComparison.Ordinal)){if(actualUrl!=null)return false;actualUrl=arg.Substring(6);}
   }
   return actualProfile!=null&&String.Equals(Path.GetFullPath(actualProfile).TrimEnd('\\','/'),Path.GetFullPath(profile).TrimEnd('\\','/'),StringComparison.OrdinalIgnoreCase)&&actualUrl==url;
  }catch{return false;}finally{LocalFree(args);}
 }
 public static bool OwnsWindow(IntPtr h,int pid){uint owner;GetWindowThreadProcessId(h,out owner);return h!=IntPtr.Zero&&owner==pid;}
 [StructLayout(LayoutKind.Sequential)] public struct Key { public Guid format; public uint id; public Key(uint n){format=new Guid("9F4C2855-9F79-4B39-A8D0-E1D42DE1D5F3");id=n;} }
 [StructLayout(LayoutKind.Explicit,Size=24)] public struct Value { [FieldOffset(0)] public ushort type; [FieldOffset(8)] public IntPtr pointer; }
 [ComImport,Guid("886d8eeb-8cf2-4446-8d02-cdba1dbdcf99"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)] public interface Store {
  [PreserveSig] int Count(out uint count); [PreserveSig] int At(uint i,out Key key);
  [PreserveSig] int Get(ref Key key,out Value value); [PreserveSig] int Set(ref Key key,ref Value value); [PreserveSig] int Commit();
 }
 [DllImport("shell32.dll")] static extern int SHGetPropertyStoreForWindow(IntPtr h,ref Guid iid,out Store store);
 [DllImport("ole32.dll")] static extern int PropVariantClear(ref Value value);
 static string Read(Store store,uint id){var key=new Key(id);Value value;Marshal.ThrowExceptionForHR(store.Get(ref key,out value));try{if(value.type==0)return null;if(value.type!=31)throw new InvalidOperationException();return Marshal.PtrToStringUni(value.pointer);}finally{PropVariantClear(ref value);}}
 static void Write(Store store,uint id,string text){var key=new Key(id);var value=new Value();if(text!=null){value.type=31;value.pointer=Marshal.StringToCoTaskMemUni(text);}try{Marshal.ThrowExceptionForHR(store.Set(ref key,ref value));}finally{PropVariantClear(ref value);}}
 public static bool SetTaskbarIcon(IntPtr h,int pid,string icon,string browser,string profile,string url,string appId) {
  if(!OwnsWindow(h,pid)||!File.Exists(icon)||!Matches(CommandLine(pid),profile,url))return false;
  Guid iid=typeof(Store).GUID;Store store=null;
  var previous=new Dictionary<uint,string>();var changed=new List<uint>();
  try {
   Marshal.ThrowExceptionForHR(SHGetPropertyStoreForWindow(h,ref iid,out store));
   // Windows copies strings. No process-owned HICON must survive this helper.
   // Group ID is last, after all resources. No shortcuts or registry entries.
   var values=new Dictionary<uint,string>{{2,"\""+browser+"\" --app="+url+" \"--user-data-dir="+profile+"\""},{4,"Fatfish Notes"},{3,icon+",0"},{5,appId}};
   foreach(var entry in values)previous[entry.Key]=Read(store,entry.Key);
   foreach(var entry in values){if(previous[entry.Key]!=entry.Value){Write(store,entry.Key,entry.Value);changed.Add(entry.Key);}}
   return true;
  }catch{
   for(int i=changed.Count-1;i>=0;i--)try{Write(store,changed[i],previous[changed[i]]);}catch{}
   return false;
  }finally{if(store!=null)Marshal.ReleaseComObject(store);}
 }
}
