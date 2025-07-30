"""
FITT-VP Principle Framework for Exercise Prescription
F - Frequency, I - Intensity, T - Time, T - Type, V - Volume, P - Progression
Based on ACSM guidelines and WHO 2020 recommendations
"""

from dataclasses import dataclass
from typing import Dict, List, Optional, Union
from enum import Enum
import json

class ExerciseType(Enum):
    AEROBIC = "aerobic"
    RESISTANCE = "resistance"
    FLEXIBILITY = "flexibility"
    NEUROMOTOR = "neuromotor"  # balance, coordination, agility

class IntensityLevel(Enum):
    LIGHT = "light"
    MODERATE = "moderate"
    VIGOROUS = "vigorous"
    VERY_VIGOROUS = "very_vigorous"

@dataclass
class FITTVPPrescription:
    # Core FITT-VP Components
    frequency: str  # How often (days per week)
    intensity: Union[str, Dict]  # How hard (RPE, %HRmax, etc.)
    time: str  # How long (duration per session)
    type: List[str]  # What kind of exercise
    volume: str  # Total amount (frequency × time)
    progression: str  # How to advance over time
    
    # Additional context
    rationale: str
    modifications: List[str]
    monitoring: List[str]

class FITTVPFramework:
    
    def __init__(self):
        self.intensity_guidelines = self._create_intensity_guidelines()
        self.exercise_types = self._create_exercise_type_definitions()
        self.progression_strategies = self._create_progression_strategies()
    
    def _create_intensity_guidelines(self) -> Dict:
        """Define intensity guidelines using multiple scales"""
        return {
            "aerobic": {
                IntensityLevel.LIGHT: {
                    "hr_percentage": "40-54% HRmax",
                    "rpe_scale": "2-3 (6-20 scale) or 1-2 (0-10 scale)",
                    "talk_test": "Can sing while exercising",
                    "examples": ["Slow walking", "Light household tasks"]
                },
                IntensityLevel.MODERATE: {
                    "hr_percentage": "55-69% HRmax",
                    "rpe_scale": "4-6 (6-20 scale) or 3-4 (0-10 scale)",
                    "talk_test": "Can talk but not sing",
                    "examples": ["Brisk walking", "Water aerobics", "Ballroom dancing"]
                },
                IntensityLevel.VIGOROUS: {
                    "hr_percentage": "70-85% HRmax",
                    "rpe_scale": "7-8 (6-20 scale) or 5-6 (0-10 scale)",
                    "talk_test": "Can only speak few words without pausing",
                    "examples": ["Jogging/running", "Swimming laps", "Basketball"]
                }
            },
            "resistance": {
                IntensityLevel.LIGHT: {
                    "percentage_1rm": "40-50% 1RM",
                    "repetitions": "15-20 reps",
                    "rpe_scale": "2-3 (6-20 scale)",
                    "examples": ["Bodyweight exercises", "Light weights"]
                },
                IntensityLevel.MODERATE: {
                    "percentage_1rm": "60-70% 1RM",
                    "repetitions": "8-12 reps",
                    "rpe_scale": "4-6 (6-20 scale)",
                    "examples": ["Moderate weight training", "Resistance bands"]
                },
                IntensityLevel.VIGOROUS: {
                    "percentage_1rm": "75-85% 1RM",
                    "repetitions": "6-8 reps",
                    "rpe_scale": "7-8 (6-20 scale)",
                    "examples": ["Heavy weight training", "Power lifting"]
                }
            }
        }
    
    def _create_exercise_type_definitions(self) -> Dict:
        """Define exercise types with specific characteristics"""
        return {
            ExerciseType.AEROBIC: {
                "definition": "Rhythmic, continuous activities using large muscle groups",
                "primary_benefits": [
                    "Cardiovascular health",
                    "Endurance",
                    "Weight management",
                    "Mental health"
                ],
                "examples": [
                    "Walking/jogging",
                    "Swimming",
                    "Cycling",
                    "Dancing",
                    "Group fitness classes"
                ],
                "measurements": ["Heart rate", "RPE", "Duration", "Distance"]
            },
            ExerciseType.RESISTANCE: {
                "definition": "Activities that improve muscular strength and endurance",
                "primary_benefits": [
                    "Muscle strength",
                    "Bone density",
                    "Metabolic health",
                    "Functional capacity"
                ],
                "examples": [
                    "Weight lifting",
                    "Bodyweight exercises",
                    "Resistance bands",
                    "Functional training"
                ],
                "measurements": ["Weight", "Repetitions", "Sets", "RPE"]
            },
            ExerciseType.FLEXIBILITY: {
                "definition": "Activities that maintain or improve range of motion",
                "primary_benefits": [
                    "Joint mobility",
                    "Injury prevention",
                    "Muscle relaxation",
                    "Posture improvement"
                ],
                "examples": [
                    "Static stretching",
                    "Dynamic stretching",
                    "Yoga",
                    "Tai Chi"
                ],
                "measurements": ["Range of motion", "Hold time", "Frequency"]
            },
            ExerciseType.NEUROMOTOR: {
                "definition": "Activities that improve balance, coordination, and agility",
                "primary_benefits": [
                    "Fall prevention",
                    "Functional mobility",
                    "Coordination",
                    "Proprioception"
                ],
                "examples": [
                    "Balance training",
                    "Tai Chi",
                    "Yoga",
                    "Functional movements"
                ],
                "measurements": ["Balance tests", "Coordination assessments", "Function scores"]
            }
        }
    
    def _create_progression_strategies(self) -> Dict:
        """Define progression strategies for different goals"""
        return {
            "general_health": {
                "principle": "Gradual increase in volume before intensity",
                "progression_rate": "5-10% increase per week",
                "sequence": ["Frequency → Time → Intensity → Type complexity"],
                "timeline": "Progress over 4-6 weeks per level"
            },
            "weight_loss": {
                "principle": "Emphasize caloric expenditure and sustainability",
                "progression_rate": "10-15% volume increase per week",
                "sequence": ["Time → Frequency → Intensity"],
                "timeline": "Focus on consistency over 12+ weeks"
            },
            "strength_building": {
                "principle": "Progressive overload with adequate recovery",
                "progression_rate": "2.5-5% load increase when completing target reps",
                "sequence": ["Reps → Weight → Sets → Exercise complexity"],
                "timeline": "2-4 week cycles with deload weeks"
            },
            "endurance": {
                "principle": "Build aerobic base before intensity work",
                "progression_rate": "10% time/distance increase per week",
                "sequence": ["Time → Frequency → Intensity → Sport-specific"],
                "timeline": "Base building 8-12 weeks, then intensity phases"
            },
            "rehabilitation": {
                "principle": "Pain-free range of motion before strengthening",
                "progression_rate": "Conservative 5% increases",
                "sequence": ["Range of motion → Strength → Functional movements"],
                "timeline": "Individual based on healing and response"
            }
        }
    
    def create_prescription(self,
                          goal: str,
                          current_fitness: str,
                          time_available: int,  # minutes per session
                          frequency_available: int,  # days per week
                          exercise_preferences: List[str] = None,
                          limitations: List[str] = None) -> FITTVPPrescription:
        """Create comprehensive FITT-VP prescription"""
        
        # Determine primary exercise types based on goal
        if goal.lower() in ["weight_loss", "cardiovascular_health"]:
            primary_types = ["aerobic", "resistance"]
            aerobic_emphasis = 70
        elif goal.lower() in ["strength", "muscle_building"]:
            primary_types = ["resistance", "aerobic"]
            aerobic_emphasis = 30
        elif goal.lower() in ["general_health", "maintenance"]:
            primary_types = ["aerobic", "resistance", "flexibility"]
            aerobic_emphasis = 50
        else:
            primary_types = ["aerobic", "resistance"]
            aerobic_emphasis = 60
        
        # Adjust based on current fitness level
        if current_fitness.lower() == "beginner":
            intensity_level = IntensityLevel.LIGHT
            frequency = f"{min(frequency_available, 3)} days/week"
            time = f"{min(time_available, 30)} minutes"
        elif current_fitness.lower() == "intermediate":
            intensity_level = IntensityLevel.MODERATE
            frequency = f"{min(frequency_available, 5)} days/week"
            time = f"{min(time_available, 45)} minutes"
        else:  # advanced
            intensity_level = IntensityLevel.VIGOROUS
            frequency = f"{frequency_available} days/week"
            time = f"{time_available} minutes"
        
        # Create intensity prescription
        aerobic_intensity = self.intensity_guidelines["aerobic"][intensity_level]
        resistance_intensity = self.intensity_guidelines["resistance"][intensity_level]
        
        intensity_prescription = {
            "aerobic": f"{aerobic_intensity['hr_percentage']} or RPE {aerobic_intensity['rpe_scale']}",
            "resistance": f"{resistance_intensity['percentage_1rm']} or {resistance_intensity['repetitions']}",
            "talk_test": aerobic_intensity['talk_test']
        }
        
        # Calculate volume
        sessions_per_week = int(frequency.split()[0])
        minutes_per_session = int(time.split()[0])
        total_weekly_volume = sessions_per_week * minutes_per_session
        
        # Get progression strategy
        progression_strategy = self.progression_strategies.get(goal.lower(), 
                                                             self.progression_strategies["general_health"])
        
        # Create modifications based on limitations
        modifications = []
        if limitations:
            for limitation in limitations:
                if "knee" in limitation.lower():
                    modifications.append("Use low-impact aerobic activities")
                if "back" in limitation.lower():
                    modifications.append("Avoid overhead movements initially")
                if "time" in limitation.lower():
                    modifications.append("Consider high-intensity interval training")
        
        # Monitoring recommendations
        monitoring = [
            "Track RPE (Rate of Perceived Exertion) each session",
            "Monitor weekly volume progression",
            "Assess recovery between sessions",
            "Record functional improvements"
        ]
        
        if "heart" in str(limitations).lower():
            monitoring.append("Monitor heart rate during exercise")
        
        return FITTVPPrescription(
            frequency=frequency,
            intensity=intensity_prescription,
            time=time,
            type=primary_types,
            volume=f"{total_weekly_volume} minutes/week",
            progression=f"{progression_strategy['principle']} - {progression_strategy['progression_rate']}",
            rationale=f"Designed for {goal} considering {current_fitness} fitness level",
            modifications=modifications,
            monitoring=monitoring
        )
    
    def create_periodized_plan(self, 
                              base_prescription: FITTVPPrescription,
                              duration_weeks: int = 12) -> Dict:
        """Create periodized training plan"""
        
        phases = {
            "Phase 1 (Weeks 1-4): Foundation": {
                "focus": "Establish exercise habit and base fitness",
                "modifications": "Reduce intensity by 10-20% from prescription",
                "key_goals": ["Consistency", "Proper form", "Recovery adaptation"]
            },
            "Phase 2 (Weeks 5-8): Development": {
                "focus": "Follow full prescription parameters",
                "modifications": "Implement full FITT-VP prescription",
                "key_goals": ["Progressive overload", "Skill development", "Increased volume"]
            },
            "Phase 3 (Weeks 9-12): Optimization": {
                "focus": "Enhance performance and maintenance",
                "modifications": "Increase intensity or add complexity",
                "key_goals": ["Performance gains", "Goal achievement", "Long-term planning"]
            }
        }
        
        if duration_weeks > 12:
            phases["Phase 4 (Weeks 13+): Maintenance/Specialization"] = {
                "focus": "Maintain gains or specialize based on new goals",
                "modifications": "Adjust based on outcomes and new objectives",
                "key_goals": ["Maintenance", "New challenges", "Lifestyle integration"]
            }
        
        return {
            "base_prescription": base_prescription,
            "total_duration": f"{duration_weeks} weeks",
            "phases": phases,
            "reassessment_points": [4, 8, 12],
            "success_metrics": [
                "Adherence rate (target: >80%)",
                "RPE progression (should decrease for same workload)",
                "Functional improvements",
                "Goal-specific outcomes"
            ]
        }

def main():
    """Demonstrate FITT-VP framework usage"""
    framework = FITTVPFramework()
    
    # Example prescriptions
    examples = [
        {
            "goal": "weight_loss",
            "current_fitness": "beginner",
            "time_available": 45,
            "frequency_available": 4,
            "exercise_preferences": ["walking", "swimming"],
            "limitations": ["knee pain"]
        },
        {
            "goal": "strength",
            "current_fitness": "intermediate",
            "time_available": 60,
            "frequency_available": 3,
            "exercise_preferences": ["weight training"],
            "limitations": None
        }
    ]
    
    for i, example in enumerate(examples, 1):
        print(f"\n{'='*60}")
        print(f"FITT-VP PRESCRIPTION EXAMPLE {i}")
        print(f"{'='*60}")
        
        prescription = framework.create_prescription(**example)
        
        print(f"Goal: {example['goal'].title()}")
        print(f"Fitness Level: {example['current_fitness'].title()}")
        print(f"\nFITT-VP PRESCRIPTION:")
        print(f"  Frequency: {prescription.frequency}")
        print(f"  Intensity: {prescription.intensity}")
        print(f"  Time: {prescription.time}")
        print(f"  Type: {', '.join(prescription.type)}")
        print(f"  Volume: {prescription.volume}")
        print(f"  Progression: {prescription.progression}")
        
        if prescription.modifications:
            print(f"\nModifications:")
            for mod in prescription.modifications:
                print(f"  • {mod}")
        
        print(f"\nMonitoring:")
        for monitor in prescription.monitoring:
            print(f"  • {monitor}")
        
        # Show periodized plan
        periodized = framework.create_periodized_plan(prescription)
        print(f"\nPERIODIZED PLAN ({periodized['total_duration']}):")
        for phase, details in periodized['phases'].items():
            print(f"  {phase}:")
            print(f"    Focus: {details['focus']}")
            print(f"    Goals: {', '.join(details['key_goals'])}")

if __name__ == "__main__":
    main()