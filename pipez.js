const O = Object

/*  ------------------------------------------------------------------------ */

const merge = (to, from) => {

    for (const prop in from) { O.defineProperty (to, prop, O.getOwnPropertyDescriptor (from, prop)) }

    return to
}

/*  ------------------------------------------------------------------------ */

const pipez = module.exports = (functions_, prev) => {

    let functions = {} // bound to self

    const functionNames = Reflect.ownKeys (functions_) // guaranteed to be in property creation order (as defined by the standard)
    const self = O.assign (

    /*  Function of functions (call chain)  */

        (...initial) => functionNames.reduce ((memo, k) => functions[k].call (self, memo, { initialArguments: initial }), initial),

    /*  Additional methods     */

        {
            configure (overrides = {}) {

                const modifiedFunctions = {}

                for (const k of functionNames) {

                    const override = overrides[k],
                          before   = overrides['+' + k] || (x => x),
                          after    = overrides[k + '+'] || (x => x)

                    const boundArgs = (typeof override === 'boolean') ? { yes: override } : (override || {})

                    modifiedFunctions[k] = function (x, args) {

                        const fn = (typeof override === 'function') ? override : functions[k] // dont cache so people can dynamically change .impl ()

                        const newArgs = O.assign ({}, boundArgs, args),
                              maybeFn = (newArgs.yes === false) ? (x => x) : fn

                        return after.call (this,
                                    maybeFn.call (this,
                                        before.call (this, x, newArgs), newArgs), newArgs)
                    }
                }

                return pipez (modifiedFunctions, self).methods (this.methods_)
            },

            from (name) {

                let subset = null

                for (const k of functionNames) {
                    if (k === name) { subset = { takeFirstArgument: (args, cfg) => args[0] } }
                    if (subset) { subset[k] = functions[k] }
                }

                return pipez (subset, self)
            },

            before (name) {

                let subset = {}

                for (const k of functionNames) {
                    if (k === name) break;
                    subset[k] = functions[k]
                }

                return pipez (subset, self)
            },

            methods_: {},

            methods (methods) { return merge (this, merge (this.methods_, methods)) },

            get impl () { return functions },
            get prev () { return prev }
        }
    )

    for (let [k, f] of O.entries (functions_)) { functions[k] = f.bind (self) }

    return self
}

/*  ------------------------------------------------------------------------ */
