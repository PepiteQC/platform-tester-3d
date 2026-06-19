local function HasAdminAccess(ply)
    -- Si la commande vient directement de la console serveur
    if not IsValid(ply) then
        return true
    end

    return ply:IsAdmin() or ply:IsSuperAdmin()
end

local function FindPlayerByName(name)
    name = string.lower(name)

    for _, ply in ipairs(player.GetAll()) do
        if string.find(string.lower(ply:Nick()), name, 1, true) then
            return ply
        end
    end

    return nil
end

local function AdminLog(ply, action)
    local adminName = IsValid(ply) and ply:Nick() or "SERVER"
    print("[ETHER ADMIN] " .. adminName .. " -> " .. action)
end

concommand.Add("ea_kick", function(ply, cmd, args)
    if not HasAdminAccess(ply) then
        if IsValid(ply) then
            ply:ChatPrint("Tu n'as pas la permission.")
        end
        return
    end

    local targetName = args[1]
    if not targetName then
        if IsValid(ply) then
            ply:ChatPrint("Usage: ea_kick <joueur> <raison>")
        else
            print("Usage: ea_kick <joueur> <raison>")
        end
        return
    end

    local target = FindPlayerByName(targetName)
    if not IsValid(target) then
        if IsValid(ply) then
            ply:ChatPrint("Joueur introuvable.")
        else
            print("Joueur introuvable.")
        end
        return
    end

    table.remove(args, 1)
    local reason = table.concat(args, " ")
    if reason == "" then
        reason = "Aucune raison donnée"
    end

    AdminLog(ply, "kick " .. target:Nick() .. " | Raison: " .. reason)
    target:Kick(reason)
end)