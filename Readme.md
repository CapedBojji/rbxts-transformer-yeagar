# rbxts-transformer-yeagar

This is a simple transformer that turns $path("src/shared/file") into
the correct rojo resolved path [ReplicatedStorage, file]
-- Note: Its not very smart and assumes the root of the files is /src and the output roblox-ts root is /out
so it replaces the first occurance of src with out

you are meant to build your own wrapper around it, if you want to require the file for example

