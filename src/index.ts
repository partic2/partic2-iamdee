namespace Iamdee {
  /* Only type definition */

  export interface ScriptLoader{
    loadModule(moduleId:string,url:string,done:(err:Error|null)=>void):void;
    getDefiningModule():string|null;
  }

  export interface NodeCreatedCallback {
    (el: Element): void;
  }

  export interface Config {
    baseUrl?: string;
    urlArgs?: string;
    onNodeCreated?: NodeCreatedCallback;
    IAMDEE_PRODUCTION_BUILD?:boolean;
  }

  export interface RequireCallback {
    (...args: any[]): void;
  }

  export interface DefineFactoryFunction {
    (...args: any[]): unknown;
  }

  export type DefineFactory = DefineFactoryFunction | object;

  export interface RequireFunction {
    (dependencyId: string): unknown;
    (
      dependencyIds: string[],
      onSuccess: RequireCallback,
      onError?: (error: Error) => void
    ): void;
    (
      dependencyIds: string[],
      onSuccess?: RequireCallback,
      onError?: (error: Error) => void
    ): unknown;
    config: (config: Config) => void;
    undef: (moduleId:string) => void;
    getConfig:()=>Config;
    getDefined:()=>{[name:string]:any};
    getFailed:()=>{[name:string]:{error:Error}}
    localRequireModule:string
  }

  export type AnonymousDefineWithDependenciesArgs = [string[], DefineFactory];

  export type AnonymousDefineWithoutDependenciesArgs = [DefineFactory];

  export type AnonymousDefineArgs =
    | AnonymousDefineWithDependenciesArgs
    | AnonymousDefineWithoutDependenciesArgs;

  export type NamedDefineWithDependenciesArgs = [
    string,
    string[],
    DefineFactory
  ];

  export type NamedDefineWithoutDependenciesArgs = [string, DefineFactory];

  export type NamedDefineArgs =
    | NamedDefineWithDependenciesArgs
    | NamedDefineWithoutDependenciesArgs;

  export type DefineArgs = AnonymousDefineArgs | NamedDefineArgs;

  export interface DefineFunction {
    (factory: DefineFactory): void;
    (dependencies: string[], factory: DefineFactory): void;
    (id: string, dependencies: string[], factory: DefineFactory): void;
    (id: string, factory: DefineFactory): void;
    <T extends DefineArgs>(...args: T): void;
    amd: {
      provider:string,
      scriptLoaders:ScriptLoader[]
    };
  }

}



(function(undefined) {
  //globalThis polyfill
  try{
    let _=globalThis
  }catch(e){
    new Function('this.globalThis=this')()
  }
  let scriptLoaders:Iamdee.ScriptLoader[] = [];
  class BrowserScriptLoader implements Iamdee.ScriptLoader{
    loadModule(moduleId: string, url: string, done: (err: Error | null) => void): void {
      // Adding new script to the browser. Since it is inserted
      // dynamically it will be "async" by default
      const el = document.createElement("script");
      el.setAttribute('_amd_moduleId',moduleId);
      el.async=true;
      el.src = url;
      el.onerror = function(err) {
        done(new Error(err.toString()));
      };
      el.onload = function() {
        done(null);
      };
      document.head.appendChild(el);
    }
    getDefiningModule(): string | null {
      if(document.currentScript!=null){
        return document.currentScript.getAttribute('_amd_moduleId');
      }
      return null;
    }
  }
  class BrowserWorkerScriptLoader implements Iamdee.ScriptLoader{
    currentDefining:string|null=null;
    loadModule(moduleId: string, url: string, done: (err: Error | null) => void): void {
      this.currentDefining=moduleId;
      try{
        (globalThis as any).importScripts(url);
        done(null);
      }catch(e){
        done(e as Error);
      }finally{
        this.currentDefining=null;
      }
    }
    getDefiningModule(): string | null {
      return this.currentDefining;
    }
  }
  if(globalThis.window!=undefined && globalThis.document!=undefined){
    scriptLoaders.push(new BrowserScriptLoader());
  }else if(globalThis.self!=undefined && typeof((globalThis as any).importScripts)=='function'){
    scriptLoaders.push(new BrowserWorkerScriptLoader());
  }

  const enum ModuleState {
    DEFINED = 0,
    NETWORK_LOADING = 1,
    WAITING_FOR_DEPENDENCIES = 2,
    INITIALIZED = 3,
    ERROR = 4
  }

  type ModuleId = string;
  type ModulePath = string;
  type SourceUrl = string;

  interface ModuleCallback {
    (module: Module): void;
  }

  interface BaseModule{
    moduleState:number;
  }
  interface DefinedModule extends BaseModule{
    moduleState: ModuleState.DEFINED;
    forceInit: () => void;
    callbacks: ModuleCallback[];
  }

  interface NetworkLoadingModule extends BaseModule{
    moduleState: ModuleState.NETWORK_LOADING;
    callbacks: ModuleCallback[];
  }

  interface WaitingForDependenciesModule extends BaseModule{
    moduleState: ModuleState.WAITING_FOR_DEPENDENCIES;
    callbacks: ModuleCallback[];
    exports: {};
  }

  interface InitializedModule extends BaseModule{
    moduleState: ModuleState.INITIALIZED;
    exports: unknown;
  }

  interface ErrorModule extends BaseModule{
    moduleState: ModuleState.ERROR;
    moduleError: Error;
  }

  type Module =
    | DefinedModule
    | NetworkLoadingModule
    | WaitingForDependenciesModule
    | InitializedModule
    | ErrorModule;

  const moduleMap: { [key: string]: Module } = {};
  function noop() {}

  function panic(message: string) {
    if (!config1.IAMDEE_PRODUCTION_BUILD) {
      throw Error(message);
    }
  }
  let config1 = {baseUrl:'./'} as Iamdee.Config;

  function isAnonymousDefine(
    args: Iamdee.DefineArgs
  ): args is Iamdee.AnonymousDefineArgs {
    return typeof args[0] != "string";
  }

  function isAnonymousDefineWithDependencies(
    args: Iamdee.AnonymousDefineArgs
  ): args is Iamdee.AnonymousDefineWithDependenciesArgs {
    return Array.isArray(args[0]);
  }

  function isNamedDefineWithDependencies(
    args: Iamdee.NamedDefineArgs
  ): args is Iamdee.NamedDefineWithDependenciesArgs {
    return Array.isArray(args[1]);
  }

  function config(conf: Iamdee.Config) {
    for(let k in conf){
      (config1 as any)[k]=(conf as any)[k];
    }
    if(config1.baseUrl==undefined)config1.baseUrl='./';
    if(config1.IAMDEE_PRODUCTION_BUILD==undefined)config1.IAMDEE_PRODUCTION_BUILD=false;
  }

  function resolveModule(
    id: ModuleId,
    module: InitializedModule | ErrorModule
  ) {
    const currentModule = moduleMap[id];
    if (!currentModule) {
      return panic("Trying to resolve non-existing module");
    }
    if (
      currentModule.moduleState == ModuleState.INITIALIZED ||
      currentModule.moduleState == ModuleState.ERROR
    ) {
      return panic(
        "Can not double resolve module " + currentModule.moduleState
      );
    }
    // This makes sure script errors are reported
    // to console and any custom onerror handlers
    if (module.moduleState == ModuleState.ERROR) {
      setTimeout(function() {
        throw module.moduleError;
      });
    }
    moduleMap[id] = module;
    currentModule.callbacks.map(function(cb) {
      cb(module);
    });
  }

  function isModuleId(value: any): value is ModuleId {
    return typeof value === "string";
  }

  function request(
    id: ModuleId,
    callback: ModuleCallback
  ) {
    const module = moduleMap[id];
    if (!module) {
      let prefix=config1.baseUrl!;
      if(prefix.charAt(prefix.length-1)!='/')prefix+='/'
      let urlArgs=config1.urlArgs??'';
      if(urlArgs!=='')urlArgs='?'+urlArgs;
      let src = /^\/|^\w+:|\.js$/.test(id) ? id : prefix + id;
      src+='.js'+urlArgs;
      loadModule(id, src as SourceUrl, callback);
    } else {
      if (
        module.moduleState == ModuleState.INITIALIZED ||
        module.moduleState == ModuleState.ERROR
      ) {
        callback(module);
      } else if (module.moduleState == ModuleState.NETWORK_LOADING) {
        module.callbacks.push(callback);
      } else if (module.moduleState == ModuleState.DEFINED) {
        module.callbacks.push(callback);
        module.forceInit();
      } else if (module.moduleState == ModuleState.WAITING_FOR_DEPENDENCIES) {
          module.callbacks.push(callback);
      }
    }
  }

  function createRequire(moduleId: ModuleId) {
    const baseId = moduleId.replace(/[^/]+$/, "");

    function modulePathToId(path: ModulePath): ModuleId {
      let temp: string = path;
      let result: string = path;
      if (result[0] == ".") {
        result = baseId + result;
        while (result != temp) {
          temp = result;
          // Turns /./ and // into /
          result = result.replace(/\/\.?\//, "/");
          // Turns foo/bar/../buzz into foo/buzz
          result = result.replace(/[^/]+\/\.\.(\/|$)/, "");
        }
      }
      return result as ModuleId;
    }

    const require = function(
      moduleIdOrDependencyPathList: ModuleId | ModulePath[],
      onSuccess?: Iamdee.RequireCallback,
      onError?: (error: Error) => unknown
    ) {
      if (isModuleId(moduleIdOrDependencyPathList)) {
        const module = moduleMap[moduleIdOrDependencyPathList];
        if (!module || module.moduleState !== ModuleState.INITIALIZED) {
          throw Error("#3 " + moduleIdOrDependencyPathList);
        }
        return module.exports;
      }
      const dependencyIds = moduleIdOrDependencyPathList.map(modulePathToId);
      let remainingDependencies = moduleIdOrDependencyPathList.length + 1;

      function ensureCommonJsDependencies() {
        let cjsModule: { exports: unknown } = { exports: {} };
        const module = moduleMap[moduleId];
        if (module) {
          if (module.moduleState == ModuleState.WAITING_FOR_DEPENDENCIES) {
            cjsModule = module;
          } else {
            //In module require()
          }
        }
        moduleMap["require"] = {
          moduleState: ModuleState.INITIALIZED,
          exports: require
        };
        moduleMap["exports"] = {
          moduleState: ModuleState.INITIALIZED,
          exports: cjsModule.exports
        };
        moduleMap["module"] = {
          moduleState: ModuleState.INITIALIZED,
          exports: cjsModule
        };
      }

      function dependencyReadyCallback() {
        if (--remainingDependencies == 0) {
          ensureCommonJsDependencies();
          try {
            const dependencies: unknown[] = dependencyIds.map(function(id) {
              const module = moduleMap[id];
              if (!module) {
                return panic(
                  "Mismatch in reported and actually loaded modules"
                );
              }
              if (
                module.moduleState == ModuleState.NETWORK_LOADING ||
                module.moduleState == ModuleState.DEFINED
              ) {
                return panic(
                  "Unexpected module state when resolving dependencies"
                );
              }
              if (module.moduleState == ModuleState.ERROR) {
                throw Error("#4 " + id);
              }
              return module.exports;
            });
            (onSuccess || noop).apply(undefined, dependencies);
          } catch (error) {
            (onError || noop)(error as Error);
          }
        }
      }

      ensureCommonJsDependencies();
      dependencyIds.forEach(function(id) {
        request(id, dependencyReadyCallback);
      });
      globalThis.queueMicrotask?
        globalThis.queueMicrotask(dependencyReadyCallback):
        setTimeout(dependencyReadyCallback);
    } as Iamdee.RequireFunction;
    require.config = config;
    require.undef = function(moduleId:string){
      delete moduleMap[moduleId];
    }
    require.getConfig=function(){
      return config1;
    }
    require.getDefined=function(){
      let r:Record<string,any>={};
      for(let k in moduleMap){
        let mod=moduleMap[k];
        if(mod.moduleState===ModuleState.INITIALIZED){
          r[k]=mod.exports;
        }
      }
      return r;
    }
    require.getFailed=function(){
      let r:Record<string,{error:Error}>={};
      for(let k in moduleMap){
        let mod=moduleMap[k];
        if(mod.moduleState===ModuleState.ERROR){
          r[k]={error:mod.moduleError};
        }
      }
      return r;
    }

    require.localRequireModule=moduleId
    return require;
  }

  

  function loadModule(
    id: ModuleId,
    src: SourceUrl,
    callback: ModuleCallback
  ) {
    moduleMap[id]={
      moduleState: ModuleState.NETWORK_LOADING,
      callbacks: [callback]
    };
    let nextLoader=0;
    let loaderError:Error[]=[];
    function tryNextScriptLoader(){
      if(nextLoader<scriptLoaders.length){
        let loader=scriptLoaders[nextLoader];
        nextLoader++;
        loader.loadModule(id,src,function(err){
            if(err==null){
              if (moduleMap[id].moduleState === ModuleState.NETWORK_LOADING) {
                resolveModule(id, {
                  moduleState: ModuleState.INITIALIZED,
                  exports: undefined
                });
              }
            }else{
              loaderError.push(err);
              tryNextScriptLoader();
            }
          })
      }else{
        resolveModule(id, {
          moduleState: ModuleState.ERROR,
          moduleError: Error("#5 " + loaderError.map(v=>v.toString()).join(','))
        });
      }
    }
    tryNextScriptLoader();
  }

  function doDefine(
    id: ModuleId,
    dependencies: string[],
    factory: Iamdee.DefineFactory
  ) {
    const existingModule = moduleMap[id];
    const definedModule: DefinedModule = {
      moduleState: ModuleState.DEFINED,
      callbacks: [],
      forceInit() {
        const waitingModule: WaitingForDependenciesModule = {
          moduleState: ModuleState.WAITING_FOR_DEPENDENCIES,
          callbacks: definedModule.callbacks,
          exports: {}
        };
        moduleMap[id] = waitingModule;
        const localRequire = createRequire(id);
        localRequire(
          dependencies,
          function(...args:any[]) {
            const result =
              typeof factory == "function"
                ? (factory as Function).apply(undefined, args)
                : factory;
            const exports =
              result === undefined ? waitingModule.exports : result;
            resolveModule(id, {
              moduleState: ModuleState.INITIALIZED,
              exports
            });
          },
          function(error) {
            resolveModule(id, {
              moduleState: ModuleState.ERROR,
              moduleError: error
            });
          }
        );
      }
    };
    moduleMap[id] = definedModule;
    if (existingModule) {
      if (existingModule.moduleState != ModuleState.NETWORK_LOADING) {
        return panic("Trying to define a module that is in a wrong state");
      }
      definedModule.callbacks = existingModule.callbacks;
      definedModule.forceInit();
    }
  }


  const define = function(...args:Iamdee.DefineArgs) {

    let dependencies = ["require", "exports", "module"];

    if (isAnonymousDefine(args)) {
      let expectedModuleId:string|null=null;
      for(let t1 of scriptLoaders){
        expectedModuleId=t1.getDefiningModule();
        if(expectedModuleId!=null)break;
      }
      if (!expectedModuleId) {
        throw Error("#1");
      }
      if (isAnonymousDefineWithDependencies(args)) {
        doDefine(expectedModuleId, args[0], args[1]);
      } else {
        doDefine(expectedModuleId, dependencies, args[0]);
      }
    } else {
      const id = args[0] as ModuleId;
      if (isNamedDefineWithDependencies(args)) {
        doDefine(id, args[1], args[2]);
      } else {
        doDefine(id, dependencies, args[1]);
      }
    }
  } as Iamdee.DefineFunction;
  define["amd"] = {
    provider:'iamdee(partic2 branch)',
    scriptLoaders:scriptLoaders
  };
  
  (globalThis as any)["define"] = define;
  (globalThis as any)["requirejs"] = (globalThis as any)["require"] = createRequire(
    "" as ModuleId
  );
})();
