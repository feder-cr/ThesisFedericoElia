:- module(spec, [(trace_expression/2), (match/2)]).
:- use_module(monitor(deep_subdict)).
:- use_module(library(clpr)).
match(_event, displayColor_et(R, G, B)) :- deep_subdict(_event, _{event:"mqtt", msg:_{output_fields:_{'evt.buffer':_{cmd:"publish", topic:"displayColor", payload:_{red:R, blue:B, green:G}}, 'evt.type':"read"}}}).
match(_event, notDisplayColor_et) :- not(match(_event, displayColor_et(_, _, _))).
match(_event, any_et) :- deep_subdict(_event, _{}).
match(_event, none_et) :- not(match(_event, any_et)).
trace_expression('Main', Main) :- (Main=star(var(r, var(g, var(b, (star(notDisplayColor_et)*displayColor_et(var(r), var(g), var(b)))))))).
