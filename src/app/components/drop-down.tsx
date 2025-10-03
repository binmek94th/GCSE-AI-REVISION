"use client";

import * as React from "react";
import * as DropdownPrimitive from "@radix-ui/react-dropdown-menu";
import { Check, ChevronRight, Circle } from "lucide-react";
import {cn} from "@/app/components/utils";

// Root
export const Dropdown = DropdownPrimitive.Root;

// Trigger
export const DropdownTrigger = React.forwardRef<
    React.ElementRef<typeof DropdownPrimitive.Trigger>,
    React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Trigger>
>(({ className, ...props }, ref) => (
    <DropdownPrimitive.Trigger
        ref={ref}
        className={cn("outline-none", className)}
        {...props}
    />
));
DropdownTrigger.displayName = DropdownPrimitive.Trigger.displayName;

// Content
export const DropdownContent = React.forwardRef<
    React.ElementRef<typeof DropdownPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
    <DropdownPrimitive.Portal>
        <DropdownPrimitive.Content
            ref={ref}
            sideOffset={sideOffset}
            className={cn(
                "z-50 min-w-[8rem] rounded-md border bg-popover p-1 shadow-md text-popover-foreground",
                "data-[state=open]:animate-in data-[state=closed]:animate-out",
                "data-[side=bottom]:slide-in-from-top-2",
                "data-[side=top]:slide-in-from-bottom-2",
                "data-[side=left]:slide-in-from-right-2",
                "data-[side=right]:slide-in-from-left-2",
                className
            )}
            {...props}
        />
    </DropdownPrimitive.Portal>
));
DropdownContent.displayName = DropdownPrimitive.Content.displayName;

// Item
export const DropdownItem = React.forwardRef<
    React.ElementRef<typeof DropdownPrimitive.Item>,
    React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Item> & {
    inset?: boolean;
    variant?: "default" | "destructive";
}
>(({ className, inset, variant = "default", ...props }, ref) => (
    <DropdownPrimitive.Item
        ref={ref}
        data-inset={inset}
        data-variant={variant}
        className={cn(
            "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
            "focus:bg-accent focus:text-accent-foreground",
            "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
            "data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10",
            inset && "pl-8",
            className
        )}
        {...props}
    />
));
DropdownItem.displayName = DropdownPrimitive.Item.displayName;

// Checkbox Item
export const DropdownCheckboxItem = React.forwardRef<
    React.ElementRef<typeof DropdownPrimitive.CheckboxItem>,
    React.ComponentPropsWithoutRef<typeof DropdownPrimitive.CheckboxItem>
>(({ className, children, ...props }, ref) => (
    <DropdownPrimitive.CheckboxItem
        ref={ref}
        className={cn(
            "relative flex cursor-pointer select-none items-center rounded-sm pl-8 pr-2 py-1.5 text-sm outline-none",
            "focus:bg-accent focus:text-accent-foreground",
            className
        )}
        {...props}
    >
    <span className="absolute left-2 flex size-3.5 items-center justify-center">
      <DropdownPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </DropdownPrimitive.ItemIndicator>
    </span>
        {children}
    </DropdownPrimitive.CheckboxItem>
));
DropdownCheckboxItem.displayName = DropdownPrimitive.CheckboxItem.displayName;

// Radio Group + Item
export const DropdownRadioGroup = DropdownPrimitive.RadioGroup;

export const DropdownRadioItem = React.forwardRef<
    React.ElementRef<typeof DropdownPrimitive.RadioItem>,
    React.ComponentPropsWithoutRef<typeof DropdownPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
    <DropdownPrimitive.RadioItem
        ref={ref}
        className={cn(
            "relative flex cursor-pointer select-none items-center rounded-sm pl-8 pr-2 py-1.5 text-sm outline-none",
            "focus:bg-accent focus:text-accent-foreground",
            className
        )}
        {...props}
    >
    <span className="absolute left-2 flex size-3.5 items-center justify-center">
      <DropdownPrimitive.ItemIndicator>
        <Circle className="h-2 w-2 fill-current" />
      </DropdownPrimitive.ItemIndicator>
    </span>
        {children}
    </DropdownPrimitive.RadioItem>
));
DropdownRadioItem.displayName = DropdownPrimitive.RadioItem.displayName;

// Label
export const DropdownLabel = React.forwardRef<
    React.ElementRef<typeof DropdownPrimitive.Label>,
    React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Label>
>(({ className, ...props }, ref) => (
    <DropdownPrimitive.Label
        ref={ref}
        className={cn("px-2 py-1.5 text-sm font-medium", className)}
        {...props}
    />
));
DropdownLabel.displayName = DropdownPrimitive.Label.displayName;

// Separator
export const DropdownSeparator = React.forwardRef<
    React.ElementRef<typeof DropdownPrimitive.Separator>,
    React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Separator>
>(({ className, ...props }, ref) => (
    <DropdownPrimitive.Separator
        ref={ref}
        className={cn("my-1 h-px bg-border -mx-1", className)}
        {...props}
    />
));
DropdownSeparator.displayName = DropdownPrimitive.Separator.displayName;

// Sub Menu
export const DropdownSub = DropdownPrimitive.Sub;

export const DropdownSubTrigger = React.forwardRef<
    React.ElementRef<typeof DropdownPrimitive.SubTrigger>,
    React.ComponentPropsWithoutRef<typeof DropdownPrimitive.SubTrigger>
>(({ className, children, ...props }, ref) => (
    <DropdownPrimitive.SubTrigger
        ref={ref}
        className={cn(
            "flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
            "focus:bg-accent focus:text-accent-foreground",
            className
        )}
        {...props}
    >
        {children}
        <ChevronRight className="ml-auto h-4 w-4" />
    </DropdownPrimitive.SubTrigger>
));
DropdownSubTrigger.displayName = DropdownPrimitive.SubTrigger.displayName;

export const DropdownSubContent = React.forwardRef<
    React.ElementRef<typeof DropdownPrimitive.SubContent>,
    React.ComponentPropsWithoutRef<typeof DropdownPrimitive.SubContent>
>(({ className, ...props }, ref) => (
    <DropdownPrimitive.SubContent
        ref={ref}
        className={cn(
            "z-50 min-w-[8rem] rounded-md border bg-popover p-1 shadow-md text-popover-foreground",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            className
        )}
        {...props}
    />
));
DropdownSubContent.displayName = DropdownPrimitive.SubContent.displayName;
